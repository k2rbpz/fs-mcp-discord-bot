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

class ResilientMCPClient {
  private client: MCPClient;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.client = new MCPClient(config);
  }

  async getTools() {
    try {
      return await this.client.getTools();
    } catch (error: any) {
      if (
        error?.message?.includes('session not found') ||
        error?.toString().includes('session not found') ||
        error?.message?.includes('Connection closed') // Also handle connection closed
      ) {
        console.log(`[${this.config.id}] Session lost or connection closed. Reconnecting...`);
        try {
          await this.client.disconnect();
        } catch (disconnectError) {
          console.warn(`[${this.config.id}] Error disconnecting old client:`, disconnectError);
        }
        this.client = new MCPClient(this.config);
        return await this.client.getTools();
      }
      throw error;
    }
  }

  async disconnect() {
    return this.client.disconnect();
  }
}

// Create MCPClient instance with the external server
export const mcpFlipside = new ResilientMCPClient({
  id: 'mcp-flipside-client',
  servers: {
    flipside: { // Name the external server
      url: new URL(`https://mcp.flipsidecrypto.xyz/mcp?apiKey=${flipsideApiKey}`),
      timeout: 300000, // 5 minutes
    }
  },
});

export const mcpCoinGecko = new ResilientMCPClient({
  id: 'mcp-coingecko-client',
  servers: {
    coingecko_mcp: {
      url: new URL("https://mcp.api.coingecko.com/sse"),
      timeout: 300000, // 5 minutes
    }
  },
});

// Create a client to connect to the bot's own local MCP server.
// This enables agents to use other agents as tools.
const mcpPort = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 4000;
export const mcpLocalAgents = new ResilientMCPClient({
  id: 'mcp-local-agents-client',
  servers: {
    local_agents: {
      url: new URL(`http://localhost:${mcpPort}/sse`),
    },
  },
});

// Disconnect the MCPClient when the application exits
process.on('beforeExit', async () => {
  await Promise.all([
    mcpFlipside.disconnect(),
    mcpCoinGecko.disconnect(),
    mcpLocalAgents.disconnect(),
  ]);
});