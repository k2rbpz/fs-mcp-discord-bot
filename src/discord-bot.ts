import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { Agent } from '@mastra/core';
import { RequestQueue } from './request-queue';
import { logger } from './mastra';

export function setupDiscordBot(agent: Agent, token: string, agentName: string) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once(Events.ClientReady, readyClient => {
    logger.info(`Discord bot ${agentName} is ready! Logged in as ${readyClient.user.tag}`);
  });

  const requestQueue = new RequestQueue();

  client.on(Events.MessageCreate, async message => {
    if (!client.user || !message.mentions.has(client.user.id)) return;

    requestQueue.addToQueue(message.channelId, async () => {
      let typingInterval: NodeJS.Timeout | undefined;
      try {
        await message.channel.sendTyping();
        typingInterval = setInterval(() => {
          message.channel.sendTyping();
        }, 9000);

        const botMentionRegex = new RegExp(`<@!?${client.user!.id}>`, 'g');
        let processedPrompt = message.content.replace(botMentionRegex, '');

        message.mentions.users.forEach(user => {
          if (user.id !== client.user!.id) {
            const otherMentionRegex = new RegExp(`<@!?${user.id}>`, 'g');
            processedPrompt = processedPrompt.replace(otherMentionRegex, `@${user.username}`);
          }
        });

        const rawUserPrompt = processedPrompt.trim();
        const userTag = message.author.tag;
        const currentDate = new Date().toUTCString();

        const userPrompt = `(User: ${userTag}, Current Date: ${currentDate})\n\n${rawUserPrompt}`;

        const responseBlocks: string[] = [];
        const responseStream = await agent.stream(userPrompt, {
          memory: {
            resource: message.channelId,
            thread: message.channelId,
          },
          onStepFinish: async stepResult => {
            if (stepResult.text) {
              responseBlocks.push(stepResult.text.trim());
            }
            if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
              const toolNames = stepResult.toolCalls.map(tc => `\`${tc.toolName}\``).join(', ');
              responseBlocks.push(`> *Checking the system: ${toolNames}...*`);
            }
          },
        });

        for await (const _ of responseStream.textStream) {
          // Consuming the stream...
        }

        const fullResponse = responseBlocks.join('\n\n');

        if (fullResponse) {
          if (fullResponse.length <= 2000) {
            await message.reply(fullResponse);
          } else {
            const messagesToSend: string[] = [];
            let currentMessage = '';
            for (const block of responseBlocks) {
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
            if (messagesToSend.length > 0) {
              await message.reply(messagesToSend[0]);
              for (let i = 1; i < messagesToSend.length; i++) {
                await message.channel.send(messagesToSend[i]);
              }
            }
          }
        } else {
          await message.reply(`${agentName} seems to have nothing to say about that.`);
        }
      } catch (error) {
        logger.error('Error processing message:', error);
        await message.reply('Sorry, I ran into an error. Please try again.');
      } finally {
        if (typingInterval) {
          clearInterval(typingInterval);
        }
      }
    });
  });

  client.login(token);
  return client;
}