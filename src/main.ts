import 'dotenv/config';
import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
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

// Listen for when a message is created
client.on(Events.MessageCreate, async message => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Only respond if the bot is mentioned
  if (!message.mentions.has(client.user.id)) return;

  let typingInterval: NodeJS.Timeout | undefined;
  try {
    // Start a typing indicator that will run for the duration of the agent's work.
    // We call it once immediately, then set an interval to repeat it.
    await message.channel.sendTyping();
    typingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 9000); // Discord's typing indicator lasts for 10 seconds.

    const userPrompt = message.content.replace(/<@!?\\d+>/, '').trim();

    const responseBlocks: string[] = [];
    const responseStream = await darvishiAgent.stream(userPrompt, {
      memory: {
        resource: message.author.id,
        thread: `${message.channelId}-${message.author.id}`,
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

    // Stop the typing indicator once we have the full response.
    clearInterval(typingInterval);

    // Join the text from each step with a double newline to create an empty line between them.
    const fullResponse = responseBlocks.join('\n\n');

    if (fullResponse) {
      // Reply with the first chunk to establish context.
      await message.reply(fullResponse.substring(0, 2000));

      // Send any subsequent chunks as regular messages.
      for (let i = 2000; i < fullResponse.length; i += 2000) {
        await message.channel.send(fullResponse.substring(i, i + 2000));
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

// Log in to Discord with your client's token
client.login(token);