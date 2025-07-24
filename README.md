# Mastra Discord Bot with Flipside MCP

This project is a Discord bot built with the [Mastra](https://mastra.ai/) framework. It demonstrates how to build and run conversational AI agents that can interact with tools from remote Model Context Protocol (MCP) servers and be reached through Discord.

## Features

-   **Mastra Framework**: Leverages Mastra for building complex AI agents and workflows.
-   **Conversational Agents**: The project includes multiple AI agents, each with distinct personas and capabilities, powered by Google's Gemini models.
-   **Tool Integration**:
    -   **Flipside MCP Tools**: Agents seamlessly access on-chain data tools from Flipside Crypto's Model Context Protocol (MCP) server.
    -   **CoinGecko MCP Tools**: Agents can also fetch crypto market data (prices, volume, etc.) from CoinGecko via MCP.
-   **Discord Integration**: Runs as a Discord bot, ready to interact in any server it's invited to.
-   **Persistent Memory**: Uses a local LibSQL/SQLite database (`mastra.db`) for conversation memory, allowing for stateful interactions.

## Setup and Installation

Follow these steps to get the bot up and running on your local machine.

### 1. Prerequisites

-   Node.js (v23.11.1 or later recommended)
-   pnpm (or your preferred Node.js package manager)

### 2. Clone the Repository

```bash
git clone <your-repository-url>
cd fs-mcp-discord-mastra2
```

### 3. Install Dependencies

Install the required Node.js packages.

```bash
pnpm install
```

### 4. Configure Environment Variables

You'll need to provide API keys for the Flipside MCP server and Discord.

1.  Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and add your keys. You will need `DISCORD_TOKEN_DARVISHI` and `DISCORD_TOKEN_LYRA` from the Discord Developer Portal (one for each bot), and a `FLIPSIDE_API_KEY` from Flipside Crypto.
    Your `.env` file should look like this:
    ```.env
    DISCORD_TOKEN_DARVISHI="your_darvishi_discord_token_here"
    DISCORD_TOKEN_LYRA="your_lyra_discord_token_here"
    FLIPSIDE_API_KEY="your_flipside_api_key_here"
    ```

### 5. Start the Bot

This command runs the built application from the .mastra/output directory.

```bash
pnpm run start
```

Once executed, you will see a confirmation message in your console, and the bot should appear online in Discord.