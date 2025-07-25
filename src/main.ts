import 'dotenv/config';
import { createServer } from 'http';
import { mastra, logger } from './mastra';
import { mcpServer } from './mastra/mcp-server';
import { setupDiscordBot } from './discord-bot';

import { initializeLocalToolCache } from './mastra/tool-registry';

// Get agents from the Mastra instance
const darvishiAgent = mastra.getAgent('darvishiAgent');
const lyraAgent = mastra.getAgent('lyraAgent');

if (!darvishiAgent) {
  throw new Error('Darvishi agent not found. Make sure it is defined in src/mastra/index.ts');
}

if (!lyraAgent) {
  throw new Error('Lyra agent not found. Make sure it is defined in src/mastra/index.ts');
}

// Get Discord tokens from environment variables
const darvishiToken = process.env.DISCORD_TOKEN_DARVISHI;
const lyraToken = process.env.DISCORD_TOKEN_LYRA;

if (!darvishiToken) {
  throw new Error('DISCORD_TOKEN_DARVISHI is not set in the .env file. Please copy .env.example to .env and add your token.');
}

if (!lyraToken) {
  throw new Error('DISCORD_TOKEN_LYRA is not set in the .env file. Please copy .env.example to .env and add your token.');
}

// Setup and login Discord bots
setupDiscordBot(darvishiAgent, darvishiToken, 'Darvishi');
setupDiscordBot(lyraAgent, lyraToken, 'Lyra');

// Start the MCP Server to expose agents as tools
const mcpPort = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 4000;

// Create an HTTP server to handle requests for the MCP server.
const httpServer = createServer(async (req, res) => {
  try {
    // For each request, delegate to the MCPServer's startSSE method.
    await mcpServer.startSSE({
      // Construct the full URL from the request.
      url: new URL(req.url || '', `http://${req.headers.host || `localhost:${mcpPort}`}`),
      // Define the paths for SSE and messaging.
      ssePath: '/sse',
      messagePath: '/message',
      req,
      res,
    });
  } catch (error) {
    logger.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
});

httpServer.listen(mcpPort, () => {
  logger.info(`MCP Server running and exposing agents as tools on http://localhost:${mcpPort}/sse`);
  initializeLocalToolCache(); // Initialize local tool cache after server starts
});

httpServer.on('error', (error) => {
  logger.error('Failed to start MCP Server:', error);
  process.exit(1);
});
