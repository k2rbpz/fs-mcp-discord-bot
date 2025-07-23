import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { lyraInstructions } from './lyra-instructions';
import { toolRegistry } from '../tool-registry';

export const lyraAgent = new Agent({
  name: 'Lyra',
  description: 'Fetches crypto data (prices, volume, etc.) from CoinGecko.',
  instructions: lyraInstructions.geckoGuide,
  model: google('gemini-2.0-flash'),
  tools: () => toolRegistry.coingecko.getTools(),
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
    options: {
      lastMessages: 15, // Adjust the memory depth here
    },
  }),
});
