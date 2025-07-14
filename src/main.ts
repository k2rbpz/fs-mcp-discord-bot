import 'dotenv/config';
import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { RequestQueue } from './request-queue';
import { mastra, logger } from './mastra';

// Get the Darvishi agent from the Mastra instance
const darvishiAgent = mastra.getAgent('darvishiAgent');

if (!darvishiAgent) {
  throw new Error('Darvishi agent not found. Make sure it is defined in src/mastra/index.ts');
}

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error('DISCORD_TOKEN is not set in the .env file. Please copy .env.example to .env and add your token.');
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, readyClient => {
  logger.info(`Discord bot is ready! Logged in as ${readyClient.user.tag}`);
});

// Create a queue to handle concurrent requests per channel
const requestQueue = new RequestQueue();

// Listen for when a message is created
client.on(Events.MessageCreate, async message => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Only respond if the bot is mentioned
  if (!message.mentions.has(client.user.id)) return;
  
  // Add the message processing logic to the queue for this channel.
  // This ensures that messages in the same channel are processed sequentially.
  requestQueue.addToQueue(message.channelId, async () => {
    let typingInterval: NodeJS.Timeout | undefined;
    try {
      // Start a typing indicator that will run for the duration of the agent's work.
      // We call it once immediately, then set an interval to repeat it.
      await message.channel.sendTyping();
      typingInterval = setInterval(() => {
        message.channel.sendTyping();
      }, 9000); // Discord's typing indicator lasts for 10 seconds.

      const rawUserPrompt = message.content.replace(/<@!?\d+>/g, '').trim();
      const userTag = message.author.tag;
      const currentDate = new Date().toUTCString(); // The agent's persona is instructed to use this.

      // Prepend the user's tag and current date to the prompt to give the agent context.
      const userPrompt = `(User: ${userTag}, Current Date: ${currentDate})\n\n${rawUserPrompt}`;

      const responseBlocks: string[] = [];
      const responseStream = await darvishiAgent.stream(userPrompt, {
        memory: {
          // Use the channel ID as the resource to create a shared memory for the entire channel.
          resource: message.channelId,
        },
        onStepFinish: async stepResult => {
          // A step can have both text and tool calls.
          // We add the text first, then the tool call announcement.

          // The `text` property on `stepResult` contains the full text generated in that step.
          if (stepResult.text) {
            responseBlocks.push(stepResult.text.trim());
          }

          // Check if the agent decided to use a tool in this step.
          if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
            const toolNames = stepResult.toolCalls.map(tc => `\`${tc.toolName}\``).join(', ');
            responseBlocks.push(`> *Checking the system: ${toolNames}...*`);
          }
        },
      });

      // We must consume the stream for the process to complete and for `onStepFinish` to be called.
      // We can simply iterate through the text stream without accumulating the chunks,
      // as we are building our response from the step results.
      for await (const _ of responseStream.textStream) {
        // Consuming the stream...
      }

      // Join the text from each step with a double newline to create an empty line between them.
      const fullResponse = responseBlocks.join('\n\n');

      if (fullResponse) {
        if (full_response.length <= 2000) {
          await message.reply(fullResponse);
        } else {
          // Response is too long, send in chunks based on logical blocks.
          const messagesToSend: string[] = [];
          let currentMessage = '';

          for (const block of responseBlocks) {
            // If a single block is longer than the limit, it must be chunked.
            if (block.length > 2000) {
              if (currentMessage.length > 0) {
                messagesToSend.push(currentMessage);
                currentMessage = '';
              }
              for (let i = 0; i < block.length; i += 2000) {
                messagesToSend.push(block.substring(i, i + 2000));
              }
              continue;
            }

            const separator = currentMessage.length > 0 ? '\n\n' : '';
            if (currentMessage.length + separator.length + block.length > 2000) {
              messagesToSend.push(currentMessage);
              currentMessage = block;
            } else {
              currentMessage += separator + block;
            }
          }

          if (currentMessage.length > 0) {
            messagesToSend.push(currentMessage);
          }

          // Send the messages
          if (messagesToSend.length > 0) {
            await message.reply(messagesToSend[0]);
            for (let i = 1; i < messagesToSend.length; i++) {
              await message.channel.send(messagesToSend[i]);
            }
          }
        }
      } else {
        await message.reply("Darvishi seems to have nothing to say about that.");
      }
    } catch (error) {
      logger.error('Error processing message:', error);
      await message.reply('Sorry, I ran into an error. Please try again.');
    } finally {
      // Ensure the typing indicator is always stopped.
      if (typingInterval) {
        clearInterval(typingInterval);
      }
    }
  });
});

// Log in to Discord with your client's token
client.login(token);