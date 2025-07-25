import { Tool } from '@mastra/core/tool';
import { mcpCoinGecko, mcpFlipside, mcpLocalAgents } from './mcp-client';

// An object that defines a set of tools that can be used by an agent.
type Toolset = Record<string, Tool>;

// The duration for which the cache is considered valid (6 hours in milliseconds).
const CACHE_DURATION = 1 * 60 * 60 * 1000;

/**
 * Represents a tool description with both original and summarized versions.
 */
export type ToolDescription = {
  original: string;
  summarized: string;
};

/**
 * A class that manages the caching of a set of tools.
 *
 * @property {Toolset | undefined} cachedTools - The cached tools with original descriptions.
 * @property {Toolset | undefined} cachedSummarizedTools - The cached tools with summarized descriptions.
 * @property {number} lastUpdated - The timestamp of the last cache update.
 */
class ToolCache {
  private cachedTools: Toolset | undefined;
  private cachedSummarizedTools: Toolset | undefined;
  private lastUpdated = 0;
  private updatePromise: Promise<void> | null = null;
  private fetcher: () => Promise<Toolset>; // Make fetcher a property

  /**
   * Creates a new ToolCache instance.
   *
   * @param {string} name - The name of the toolset.
   * @param {() => Promise<Toolset>} fetcher - A function that fetches the tools.
   */
  constructor(
    private readonly name: string,
    fetcher: () => Promise<Toolset>, // Accept fetcher in constructor
  ) {
    this.fetcher = fetcher; // Assign it to the property
  }

  /**
   * Sets a new fetcher function for the tool cache.
   * @param {() => Promise<Toolset>} newFetcher - The new function that fetches the tools.
   */
  public setFetcher(newFetcher: () => Promise<Toolset>): void {
    this.fetcher = newFetcher;
    // Invalidate cache to force a re-fetch with the new fetcher
    this.cachedTools = undefined;
    this.cachedSummarizedTools = undefined;
    this.lastUpdated = 0;
    this.updatePromise = null;
  }

  /**
   * Retrieves the tools, updating the cache if it's stale.
   *
   * @param {boolean} summarized - Whether to return summarized tool descriptions.
   * @returns {Promise<Toolset>} The toolset.
   */
  async getTools(summarized: boolean): Promise<Toolset> {
    // If the cache is stale and an update is not already in progress, start one.
    if (this.isCacheStale() && !this.updatePromise) {
      // The promise is stored so that concurrent requests can wait for the same update.
      this.updatePromise = this.updateCache();
    }

    // If an update is in progress, wait for it to complete.
    if (this.updatePromise) {
      await this.updatePromise;
    }
    return (summarized ? this.cachedSummarizedTools : this.cachedTools) ?? {};
  }

  /**
   * Checks if the cache is stale.
   *
   * @returns {boolean} Whether the cache is stale.
   */
  private isCacheStale(): boolean {
    return !this.cachedTools || Date.now() - this.lastUpdated > CACHE_DURATION;
  }

  /**
   * Updates the tool cache.
   */
  private async updateCache(): Promise<void> {
    try {
      const originalTools = await this.fetcher();
      this.cachedTools = originalTools;
      this.cachedSummarizedTools = shortenDescriptions(originalTools);
      this.lastUpdated = Date.now();
    } catch (error) {
      console.error(`Failed to update ${this.name} tools:`, error);
      // Re-throw the error to prevent the agent from being initialized
      // with an empty toolset, which would lead to a silent failure.
      throw new Error(`Failed to fetch tools for ${this.name}.`);
    } finally {
      // The update process is complete (either success or failure),
      // so clear the promise to allow for future updates.
      this.updatePromise = null;
    }
  }
}

/**
 * Shortens the description of each tool in a toolset to the first sentence.
 * @param toolset The toolset to process.
 * @returns The toolset with shortened descriptions.
 */
const shortenDescriptions = (toolset: Toolset): Toolset => {
  const summarizedToolset: Toolset = {};
  for (const key in toolset) {
    const tool = { ...toolset[key] }; // Create a shallow copy to avoid modifying the original
    if (tool.description) {
      const match = tool.description.match(/[^.!?]+[.!?]/);
      tool.description = match ? match[0].trim() : tool.description;
    }
    summarizedToolset[key] = tool;
  }
  return summarizedToolset;
};

/**
 * A registry for all the tool caches.
 *
 * @property {ToolCache} flipside - The cache for Flipside tools.
 * @property {ToolCache} coingecko - The cache for CoinGecko tools.
 * @property {ToolCache} local - The cache for local tools.
 */
export const toolRegistry = {
  flipside: new ToolCache('Flipside', async () => mcpFlipside.getTools()),
  coingecko: new ToolCache('CoinGecko', async () => mcpCoinGecko.getTools()),
  local: new ToolCache('Local', async () => ({})), // Initialize with an empty fetcher
};

export const initializeLocalToolCache = () => {
  toolRegistry.local.setFetcher(async () => mcpLocalAgents.getTools());
};
