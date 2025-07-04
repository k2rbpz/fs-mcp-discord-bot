import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import { darvishiAgent } from './mastra/agents/darvishi-agent.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once(Events.ClientReady, c => {
  console.log(`Discord bot ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // Respond if the bot is mentioned
  const botId = client.user?.id;
  const isMentioned = message.mentions.has(botId || '');

  // Respond to !ask or mention
  let prompt = '';
  if (message.content.startsWith('!ask ')) {
    prompt = message.content.replace('!ask ', '').trim();
  } else if (isMentioned) {
    // Remove the mention from the message content
    prompt = message.content.replace(`<@${botId}>`, '').replace(`<@!${botId}>`, '').trim();
  }
  if (!prompt) return;
  try {
    await message.channel.sendTyping();
    const response = await darvishiAgent.generate(prompt, {
      memory: {
        resource: message.author.id,
        thread: `${message.channelId}-${message.author.id}`,
      },
    });
    await message.reply(response.text || 'No response.');
  } catch (err) {
    await message.reply('Error: ' + (err instanceof Error ? err.message : String(err)));
  }
});

client.login(process.env.DISCORD_TOKEN);
