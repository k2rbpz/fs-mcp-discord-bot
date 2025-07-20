import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Tool } from '@mastra/core/tool';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { mcpCoinGecko, mcpLocalAgents } from '../mcp-client';
import { lyraInstructions } from './lyra-instructions';

let cachedTools: Record<string, Tool> | undefined;
let lastUpdated: number = 0;
const cacheDuration: number = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * Fetches tools from the MCP server and updates the cache.
 */
async function updateToolsCache() {
  try {
    cachedTools = await mcpCoinGecko.getTools();
    lastUpdated = Date.now();
    console.log('Successfully updated cached tools from mcpCoinGecko.');
  } catch (error) {
    console.error('Failed to update tools from mcpCoinGecko.', error);
    // You might want to handle errors more specifically, e.g., retry, use a fallback, etc.
  }
}

/**
 * Checks if the cache is valid and updates it if necessary.
 */
async function ensureCacheValidity() {
  if (!cachedTools || Date.now() - lastUpdated > cacheDuration) {
    console.log('Tool cache is stale or empty. Updating...');
    await updateToolsCache();
  } else {
    console.log('Using cached tools.');
  }
}

export const lyraAgent = new Agent({
  name: 'Lyra',
  description: 'Retrieves cryptocurrency token facts and market data, such as prices and trading volume, via the CoinGecko MCP server.',
  instructions: lyraInstructions.geckoGuide,
  model: google('gemini-2.5-flash'),
  async tools() {
    // Ensure the cache for CoinGecko tools is up-to-date.
    await ensureCacheValidity();
    
    // Return only the CoinGecko tools.
    return cachedTools || {};
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
