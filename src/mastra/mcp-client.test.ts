
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient } from '@mastra/mcp';

// Store original environment to restore after tests
const originalEnv = { ...process.env };

beforeEach(() => {
  // Reset modules to ensure `mcp-client.ts` is re-evaluated with fresh env vars for each test.
  vi.resetModules();
  // Restore a clean environment for each test
  process.env = { ...originalEnv };
});

afterEach(() => {
  // Restore original environment variables after all tests in this file
  process.env = originalEnv;
});

describe('MCPClient Initialization from mcp-client.ts', () => {
  it('should throw an error if FLIPSIDE_API_KEY is not set', async () => {
    // Set up the environment for this specific test case
    process.env.COINGECKO_PRO_API_KEY = 'test-coingecko-key';
    delete process.env.FLIPSIDE_API_KEY;

    // The import will throw an error because it's evaluated at import time.
    await expect(import('./mcp-client')).rejects.toThrow(
      'FLIPSIDE_API_KEY is not set in the environment variables.'
    );
  });

  it('should throw an error if COINGECKO_PRO_API_KEY is not set', async () => {
    // Set up the environment for this specific test case
    process.env.FLIPSIDE_API_KEY = 'test-flipside-key';
    delete process.env.COINGECKO_PRO_API_KEY;

    await expect(import('./mcp-client')).rejects.toThrow(
      'COINGECKO_PRO_API_KEY is not set in the environment variables.'
    );
  });

  describe('with valid environment variables', () => {
    beforeEach(() => {
      // Set up the environment for the nested describe block
      process.env.FLIPSIDE_API_KEY = 'test-flipside-key';
      process.env.COINGECKO_PRO_API_KEY = 'test-coingecko-key';
    });

    it('should create an instance of MCPClient for Flipside with correct config', async () => {
      const { mcpFlipside } = await import('./mcp-client');
      expect(mcpFlipside).toBeInstanceOf(MCPClient);
      // @ts-expect-error - accessing private property for test
      const serverConfig = mcpFlipside.serverConfigs.flipside;
      expect(serverConfig.url.toString()).toBe(
        'https://mcp.flipsidecrypto.xyz/beta/sse?apiKey=test-flipside-key'
      );
      expect(serverConfig.timeout).toBe(300000);
    });

    it('should create an instance of MCPClient for CoinGecko with correct config', async () => {
      const { mcpCoinGecko } = await import('./mcp-client');
      expect(mcpCoinGecko).toBeInstanceOf(MCPClient);
      // @ts-expect-error - accessing private property for test
      const serverConfig = mcpCoinGecko.serverConfigs.coingecko_mcp;
      expect(serverConfig.url.toString()).toBe('https://mcp.api.coingecko.com/sse');
      expect(serverConfig.timeout).toBe(300000);
    });

    it('should create an instance of MCPClient for local agents with custom port', async () => {
      process.env.MCP_PORT = '4001';
      vi.resetModules(); // Re-import to catch the new MCP_PORT value
      const { mcpLocalAgents } = await import('./mcp-client');
      expect(mcpLocalAgents).toBeInstanceOf(MCPClient);
      // @ts-expect-error - accessing private property for test
      const serverConfig = mcpLocalAgents.serverConfigs.local_agents;
      expect(serverConfig.url.toString()).toBe('http://localhost:4001/sse');
    });

    it('should use default port 4000 for local agents if MCP_PORT is not set', async () => {
      delete process.env.MCP_PORT;
      vi.resetModules(); // Re-import to catch the missing MCP_PORT value
      const { mcpLocalAgents } = await import('./mcp-client');
      expect(mcpLocalAgents).toBeInstanceOf(MCPClient);
      // @ts-expect-error - accessing private property for test
      const serverConfig = mcpLocalAgents.serverConfigs.local_agents;
      expect(serverConfig.url.toString()).toBe('http://localhost:4000/sse');
    });
  });
});
