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

        const userPrompt = `(User: ${userTag}, Agent: ${agentName}, Current Date: ${currentDate})

${rawUserPrompt}`;

        const responseBlocks: string[] = [];
        const responseStream = await agent.stream(userPrompt, {
          memory: {
            resource: message.channelId,
            thread: message.channelId,
          },
          onStepFinish: async stepResult => {
            if (stepResult.text) {
              responseBlocks.push(stepResult.text.trim());
              // Check if the step involves a tool call (likely from a local agent)
              if (stepResult.toolCalls && stepResult.toolCalls.some(toolCall => toolCall.toolName.startsWith('local_agents_'))) {
                const lastResponse = responseBlocks.pop();
                if (lastResponse) {
                  const quotedResponse = lastResponse.replace(/^/gm, '> ');
                  responseBlocks.push(quotedResponse);
                }
              }
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
          const chunks = splitResponse(fullResponse);
          for (let i = 0; i < chunks.length; i++) {
            if (i === 0) {
              await message.reply(chunks[i]);
            } else {
              await message.channel.send(chunks[i]);
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

function splitResponse(response: string): string[] {
  const limit = 2000;
  if (response.length <= limit) {
    return [response];
  }

  const chunks: string[] = [];
  const codeBlockRegex = /```([a-z]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const [fullMatch, language, code] = match;
    const precedingText = response.substring(lastIndex, match.index);
    if (precedingText) {
      chunks.push(...splitText(precedingText, limit));
    }

    if (fullMatch.length <= limit) {
      chunks.push(fullMatch);
    } else {
      const codeLines = code.split('\n');
      let currentChunk = `\`\`\`${language}\n`;
      for (const line of codeLines) {
        if (currentChunk.length + line.length + 4 > limit) {
          chunks.push(currentChunk + '```');
          currentChunk = `\`\`\`${language}\n`;
        }
        currentChunk += line + '\n';
      }
      chunks.push(currentChunk + '```');
    }
    lastIndex = codeBlockRegex.lastIndex;
  }

  const remainingText = response.substring(lastIndex);
  if (remainingText) {
    chunks.push(...splitText(remainingText, limit));
  }

  return chunks;
}

function splitText(text: string, limit: number): string[] {
  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  const paragraphs = text.split(/\n\n/g);
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (currentChunk.length + paragraph.length + 2 > limit) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += paragraph + (i < paragraphs.length - 1 ? '\n\n' : '');
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > limit) {
      finalChunks.push(...splitBy(chunk, limit, '\n'));
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}

function splitBy(text: string, limit: number, delimiter: string): string[] {
  if (text.length <= limit) {
    return [text];
  }

  const parts = text.split(delimiter);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    if (currentChunk.length + part.length + delimiter.length > limit) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += part + delimiter;
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}