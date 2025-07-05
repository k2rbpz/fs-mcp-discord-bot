
import { describe, it, expect } from 'vitest';
import { mcp } from './mcp-client';
import { MCPClient } from '@mastra/mcp';

describe('MCPClient Initialization', () => {
  it('should create an instance of MCPClient', () => {
    expect(mcp).toBeInstanceOf(MCPClient);
  });
});
