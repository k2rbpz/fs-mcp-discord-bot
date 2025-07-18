import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { coingeckoTool } from '../tools/coingecko-tool';
import { mcp } from '../mcp-client';
import { lyraInstructions } from './lyra-instructions';

export const lyraAgent = new Agent({
  name: 'Lyra',
  // You can easily switch between personas here, e.g., lyraInstructions.kebabShop
  instructions: lyraInstructions.archivistOfTheEther,
  model: google('gemini-1.5-flash'),
  tools: { coingeckoTool, ...await mcp.getTools({ server: "coingecko" }) }, // Include local and external tools
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
    options: {
      lastMessages: 100, // Adjust the memory depth here
    },
  }),
});
