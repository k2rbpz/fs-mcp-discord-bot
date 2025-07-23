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
  async tools() {
    const allCoinGeckoTools = await toolRegistry.coingecko.getTools();

    // Whitelist of tool names to expose to the Lyra agent.
    // This ensures the agent only uses approved tools for its tasks.
    const whitelistedToolNames = [
      'coingecko_mcp_get_simple_price', // For fetching prices
      'coingecko_mcp_get_coins_markets', // For market data including volume
      'coingecko_mcp_get_search_trending', // For trending coins
      'coingecko_mcp_get_id_coins', // For fetching coin details by ID
      'coingecko_mcp_get_coins_history', // For historical data
    ];

    const whitelistedTools: Record<string, any> = {};
    for (const toolName of whitelistedToolNames) {
      if (allCoinGeckoTools[toolName]) {
        whitelistedTools[toolName] = allCoinGeckoTools[toolName];
      }
    }
    return whitelistedTools;
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
    options: {
      lastMessages: 10, // Adjust the memory depth here
    },
  }),
});
