import { createServer } from 'http';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

// --- Mocks ---

// Mock dependencies before they are imported by main.ts
const mockHttpServer = {
  listen: vi.fn(),
  on: vi.fn(),
};
vi.mock('http', () => ({
  createServer: vi.fn(() => mockHttpServer),
}));

const mockDarvishiAgent = { name: 'darvishiAgent' };
const mockLyraAgent = { name: 'lyraAgent' };
const mockMastra = {
  getAgent: vi.fn(agentName => {
    if (agentName === 'darvishiAgent') return mockDarvishiAgent;
    if (agentName === 'lyraAgent') return mockLyraAgent;
    return null;
  }),
};
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
};
vi.mock('./mastra', () => ({
  mastra: mockMastra,
  logger: mockLogger,
}));

const mockMcpServer = {
  startSSE: vi.fn(),
};
vi.mock('./mastra/mcp-server', () => ({
  mcpServer: mockMcpServer,
}));

const mockSetupDiscordBot = vi.fn();
vi.mock('./discord-bot', () => ({
  setupDiscordBot: mockSetupDiscordBot,
}));

// --- Test Suite ---

describe('main.ts', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules(); // This is crucial to re-evaluate main.ts with new mocks/env
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Initialization and Setup', () => {
    it('should throw an error if DISCORD_TOKEN_DARVISHI is not set', async () => {
      process.env.DISCORD_TOKEN_LYRA = 'lyra-token';
      delete process.env.DISCORD_TOKEN_DARVISHI;

      await expect(import('./main')).rejects.toThrow(
        'DISCORD_TOKEN_DARVISHI is not set in the .env file. Please copy .env.example to .env and add your token.',
      );
    });

    it('should throw an error if DISCORD_TOKEN_LYRA is not set', async () => {
      process.env.DISCORD_TOKEN_DARVISHI = 'darvishi-token';
      delete process.env.DISCORD_TOKEN_LYRA;

      await expect(import('./main')).rejects.toThrow(
        'DISCORD_TOKEN_LYRA is not set in the .env file. Please copy .env.example to .env and add your token.',
      );
    });

    it('should setup discord bots and start the MCP server on success', async () => {
      process.env.DISCORD_TOKEN_DARVISHI = 'darvishi-token';
      process.env.DISCORD_TOKEN_LYRA = 'lyra-token';
      process.env.MCP_PORT = '5000';

      await import('./main');

      // Verify discord bots are setup
      expect(mockSetupDiscordBot).toHaveBeenCalledTimes(2);
      expect(mockSetupDiscordBot).toHaveBeenCalledWith(mockDarvishiAgent, 'darvishi-token', 'Darvishi');
      expect(mockSetupDiscordBot).toHaveBeenCalledWith(mockLyraAgent, 'lyra-token', 'Lyra');

      // Verify MCP server is started
      expect(createServer).toHaveBeenCalledOnce();
      expect(mockHttpServer.listen).toHaveBeenCalledOnce();
      expect(mockHttpServer.listen).toHaveBeenCalledWith(5000, expect.any(Function));
      expect(mockHttpServer.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should use default port 4000 for MCP server if MCP_PORT is not set', async () => {
      process.env.DISCORD_TOKEN_DARVISHI = 'darvishi-token';
      process.env.DISCORD_TOKEN_LYRA = 'lyra-token';
      delete process.env.MCP_PORT;

      await import('./main');

      expect(mockHttpServer.listen).toHaveBeenCalledWith(4000, expect.any(Function));
    });
  });

  describe('HTTP Server Request Handling', () => {
    let requestHandler: (req: any, res: any) => Promise<void>;

    beforeEach(async () => {
      process.env.DISCORD_TOKEN_DARVISHI = 'darvishi-token';
      process.env.DISCORD_TOKEN_LYRA = 'lyra-token';
      await import('./main');
      // The call to createServer gives us the request handler
      requestHandler = (createServer as any).mock.calls[0][0];
    });

    it('should delegate requests to mcpServer.startSSE', async () => {
      const mockReq = { url: '/sse', headers: { host: 'localhost:4000' } };
      const mockRes = { headersSent: false, writeHead: vi.fn(), end: vi.fn() };

      await requestHandler(mockReq, mockRes);

      expect(mockMcpServer.startSSE).toHaveBeenCalledOnce();
      expect(mockMcpServer.startSSE).toHaveBeenCalledWith(expect.objectContaining({
        ssePath: '/sse',
        messagePath: '/message',
        req: mockReq,
        res: mockRes,
      }));
    });

    it('should log an error and send a 500 response if mcpServer.startSSE throws', async () => {
      const testError = new Error('SSE failed');
      mockMcpServer.startSSE.mockRejectedValueOnce(testError);

      const mockReq = { url: '/sse', headers: { host: 'localhost:4000' } };
      const mockRes = { headersSent: false, writeHead: vi.fn(), end: vi.fn() };

      await requestHandler(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith('Error handling MCP request:', testError);
      expect(mockRes.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Internal Server Error' }));
    });
  });

  describe('HTTP Server Error Handling', () => {
    it('should log an error and exit if the server fails to start', async () => {
      process.env.DISCORD_TOKEN_DARVISHI = 'darvishi-token';
      process.env.DISCORD_TOKEN_LYRA = 'lyra-token';
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await import('./main');

      const errorHandler = (mockHttpServer.on as any).mock.calls.find(
        (call: any) => call[0] === 'error',
      )[1];

      const testError = new Error('EADDRINUSE');
      errorHandler(testError);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start MCP Server:', testError);
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});