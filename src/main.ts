import 'dotenv/config';
import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { mastra } from './mastra';

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
  console.log(`Discord bot is ready! Logged in as ${readyClient.user.tag}`);
});

// Listen for when a message is created
client.on(Events.MessageCreate, async message => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Only respond if the bot is mentioned
  if (!message.mentions.has(client.user.id)) return;

  try {
    await message.channel.sendTyping();

    const userPrompt = message.content.replace(/<@!?\\d+>/, '').trim();

    const responseStream = await darvishiAgent.stream(userPrompt, {
      // Use the `memory` option to provide both a resource and thread identifier.
      // This scopes the conversation memory to a specific user within a specific channel.
      memory: {
        resource: message.author.id,
        thread: message.channelId,
      },
    });

    for await (const chunk of responseStream.textStream) {
      if (chunk) await message.channel.send(chunk);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await message.channel.send('Sorry, I ran into an error. Please try again.');
  }
});

// Log in to Discord with your client's token
client.login(token);