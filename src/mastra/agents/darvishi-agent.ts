import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { weatherTool } from '../tools/weather-tool';
import { mcp } from '../mcp-client';
import { darvishiInstructions } from './darvishi-instructions';

export const darvishiAgent = new Agent({
  name: 'Darvishi',
  // You can easily switch between personas here, e.g., darvishiInstructions.kebabShop
  instructions: darvishiInstructions.archivistOfTheEther,
  model: google('gemini-2.5-flash'),
  tools: { weatherTool, ...await mcp.getTools() }, // Include local and external tools
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
    options: {
      lastMessages: 100, // Adjust the memory depth here
    },
  }),
});
