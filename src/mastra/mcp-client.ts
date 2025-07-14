import 'dotenv/config';
import { MCPClient } from '@mastra/mcp';

// Retrieve the API key from environment variables
const flipsideApiKey = process.env.FLIPSIDE_API_KEY;

if (!flipsideApiKey) {
  throw new Error('FLIPSIDE_API_KEY is not set in the environment variables.');
}

// Create MCPClient instance with the external server
export const mcp = new MCPClient({
  servers: {
    flipside: { // Name the external server
      url: new URL(`https://mcp.flipsidecrypto.xyz/beta/sse?apiKey=${flipsideApiKey}`),
      timeout: 300000, // 5 minutes
    },
  },
});

// Disconnect the MCPClient when the application exits
process.on('beforeExit', async () => {
  await mcp.disconnect();
});