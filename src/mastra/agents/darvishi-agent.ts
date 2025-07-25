import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { darvishiInstructions } from './darvishi-instructions';
import { toolRegistry } from '../tool-registry';

export const createDarvishiAgent = (useSummarizedTools: boolean) => {
  return new Agent({
    name: 'Darvishi',
    description: 'Provides crypto analytics, on-chain data, and user scores from Flipside.',
    instructions: darvishiInstructions.cosmicBored,
    model: google('gemini-2.5-flash'),
    async tools() {
      const flipsideTools = await toolRegistry.flipside.getTools(useSummarizedTools);
      const localTools = await toolRegistry.local.getTools(useSummarizedTools);
      return { ...flipsideTools, ...localTools };
    },
    memory: new Memory({
      storage: new LibSQLStore({
        url: 'file:../mastra.db', // path is relative to the .mastra/output directory
      }),
      options: {
        lastMessages: 50, // Adjust the memory depth here
      },
    }),
  });
};
