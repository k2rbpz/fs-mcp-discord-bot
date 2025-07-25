import { Tool } from '@mastra/core/tool';
import { mcpCoinGecko, mcpFlipside, mcpLocalAgents } from './mcp-client';

// An object that defines a set of tools that can be used by an agent.
type Toolset = Record<string, Tool>;

// The duration for which the cache is considered valid (6 hours in milliseconds).
const CACHE_DURATION = 6 * 60 * 60 * 1000;

/**
 * A class that manages the caching of a set of tools.
 *
 * @property {Toolset | undefined} cachedTools - The cached tools.
 * @property {number} lastUpdated - The timestamp of the last cache update.
 */
class ToolCache {
  private cachedTools: Toolset | undefined;
  private lastUpdated = 0;
  private updatePromise: Promise<void> | null = null;

  /**
   * Creates a new ToolCache instance.
   *
   * @param {string} name - The name of the toolset.
   * @param {() => Promise<Toolset>} fetcher - A function that fetches the tools.
   */
  constructor(
    private readonly name: string,
    private readonly fetcher: () => Promise<Toolset>,
  ) {}

  /**
   * Retrieves the tools, updating the cache if it's stale.
   *
   * @returns {Promise<Toolset>} The toolset.
   */
  async getTools(): Promise<Toolset> {
    // If the cache is stale and an update is not already in progress, start one.
    if (this.isCacheStale() && !this.updatePromise) {
      // The promise is stored so that concurrent requests can wait for the same update.
      this.updatePromise = this.updateCache();
    }

    // If an update is in progress, wait for it to complete.
    if (this.updatePromise) {
      await this.updatePromise;
    }
    return this.cachedTools ?? {};
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
      this.cachedTools = await this.fetcher();
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
  for (const key in toolset) {
    const tool = toolset[key];
    if (tool.description) {
      const match = tool.description.match(/[^.!?]+[.!?]/);
      tool.description = match ? match[0].trim() : tool.description;
    }
  }
  return toolset;
};

/**
 * A registry for all the tool caches.
 *
 * @property {ToolCache} flipside - The cache for Flipside tools.
 * @property {ToolCache} coingecko - The cache for CoinGecko tools.
 * @property {ToolCache} local - The cache for local tools.
 */
export const toolRegistry = {
  flipside: new ToolCache('Flipside', async () =>
    shortenDescriptions(await mcpFlipside.getTools()),
  ),
  coingecko: new ToolCache('CoinGecko', async () =>
    shortenDescriptions(await mcpCoinGecko.getTools()),
  ),
  local: new ToolCache('Local', async () =>
    shortenDescriptions(await mcpLocalAgents.getTools()),
  ),
};
