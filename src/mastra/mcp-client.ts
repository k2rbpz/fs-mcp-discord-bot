import 'dotenv/config';
import { MCPClient } from '@mastra/mcp';

// Retrieve the API key from environment variables
const flipsideApiKey = process.env.FLIPSIDE_API_KEY;
const coingeckoProApiKey = process.env.COINGECKO_PRO_API_KEY;

if (!flipsideApiKey) {
  throw new Error('FLIPSIDE_API_KEY is not set in the environment variables.');
}

if (!coingeckoProApiKey) {
  throw new Error('COINGECKO_PRO_API_KEY is not set in the environment variables.');
}

// Create MCPClient instance with the external server
export const mcpFlipside = new MCPClient({
  servers: {
    flipside: { // Name the external server
      url: new URL(`https://mcp.flipsidecrypto.xyz/beta/sse?apiKey=${flipsideApiKey}`),
      timeout: 300000, // 5 minutes
    }
  },
});

export const mcpCoinGecko = new MCPClient({
  servers: {
    coingecko_mcp: {
      command: "npx",
      args: [
        "mcp-remote",
        "https://mcp.api.coingecko.com/sse"
      ]
    }
  },
});

// Disconnect the MCPClient when the application exits
process.on('beforeExit', async () => {
  await mcpFlipside.disconnect();
});

process.on('beforeExit', async () => {
  await mcpCoinGecko.disconnect();
});