import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Tool } from '@mastra/core/tool';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { mcpFlipside, mcpLocalAgents } from '../mcp-client';
import { darvishiInstructions } from './darvishi-instructions';

let cachedTools: Record<string, Tool> | undefined;
let lastUpdated: number = 0;
const cacheDuration: number = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * Fetches tools from the MCP server and updates the cache.
 */
async function updateToolsCache() {
  try {
    const rawTools = await mcpFlipside.getTools();
    const optimizedTools: Record<string, Tool> = {};

    // Process and shorten the description for each tool before caching.
    for (const toolName in rawTools) {
      const tool = rawTools[toolName];
      // A simple but effective optimization: take only the first sentence.
      const shortDescription = tool.description
        ? tool.description.split('.')[0] + '.'
        : 'No description available.';

      optimizedTools[toolName] = { ...tool, description: shortDescription };
    }

    cachedTools = optimizedTools;
    lastUpdated = Date.now();
    console.log('Successfully updated and optimized cached tools from mcpFlipside.');
  } catch (error) {
    console.error('Failed to update tools from mcpFlipside.', error);
  }
}

/**
 * Checks if the cache is valid and updates it if necessary.
 */
async function ensureCacheValidity() {
  if (!cachedTools || Date.now() - lastUpdated > cacheDuration) {
    console.log('Flipside tool cache is stale or empty. Updating...');
    await updateToolsCache();
  } else {
    console.log('Using cached Flipside tools.');
  }
}

export const darvishiAgent = new Agent({
  name: 'Darvishi',
  description: 'Provides crypto analytics, on-chain data, and user scores from Flipside.',
  instructions: darvishiInstructions.cosmicBored,
  model: google('gemini-2.5-flash'),
  async tools() {
    // Ensure the cache for Flipside tools is up-to-date.
    await ensureCacheValidity();

    // Fetch tools from the local agent server.
    let localAgentTools: Record<string, Tool> = {};
    try {
      localAgentTools = await mcpLocalAgents.getTools();
    } catch (error) {
      console.error('Failed to load tools from local agent MCP server.', error);
    }

    // Combine tools from all sources.
    return { ...(cachedTools || {}), ...localAgentTools };
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
