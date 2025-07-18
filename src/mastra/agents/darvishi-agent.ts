import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Tool } from '@mastra/core/tool';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { weatherTool } from '../tools/weather-tool';
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
    cachedTools = await mcpFlipside.getTools();
    lastUpdated = Date.now();
    console.log('Successfully updated cached tools from mcpFlipside.');
  } catch (error) {
    console.error('Failed to update tools from mcpFlipside.', error);
    // You might want to handle errors more specifically, e.g., retry, use a fallback, etc.
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
  description: 'Provides growth-focused crypto analytics, on-chain data, and user scores using the Flipside MCP server. Can also retrieve current weather information.',
  // You can easily switch between personas here, e.g., darvishiInstructions.kebabShop
  instructions: darvishiInstructions.archivistOfTheEther,
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
    return { weatherTool, ...(cachedTools || {}), ...localAgentTools };
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
