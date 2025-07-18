import { MCPServer } from '@mastra/mcp';
import { mastra } from './index';

const lyraAgent = mastra.getAgent('lyraAgent');
const darvishiAgent = mastra.getAgent('darvishiAgent');

if (!lyraAgent) {
  // This check is for safety. Mastra's getAgent should throw if an agent
  // isn't found, but this ensures we don't proceed without it.
  throw new Error('Lyra agent not found. Cannot create MCP Server.');
}

if (!darvishiAgent) {
  throw new Error('Darvishi agent not found. Cannot create MCP Server.');
}

/**
 * Creates an MCP Server to expose Mastra agents as callable tools.
 * This allows other MCP-compatible clients to interact with the agents.
 */
export const mcpServer = new MCPServer({
  name: 'Mastra Discord Bot Agent Server',
  version: '1.0.0',
  agents: {
    lyra: lyraAgent, // Exposed as the tool 'ask_lyra'
    darvishi: darvishiAgent, // Exposed as the tool 'ask_darvishi'
  },
  tools: {}, // Add an empty tools object to prevent initialization errors
});