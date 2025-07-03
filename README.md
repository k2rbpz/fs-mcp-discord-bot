# Mastra Discord Bot with Flipside MCP

This project is a Discord bot built with the [Mastra](https://mastra.ai/) framework. It features a conversational agent named "Darvishi" that connects to Flipside Crypto's [Multi-Chain Proxy (MCP)](https://mastra.ai/docs/mcp/overview) to access on-chain data tools.

## Features

-   **Mastra Framework**: Leverages Mastra for building complex AI agents and workflows.
-   **Darvishi Agent**: A sophisticated agent with a unique, "perpetually overworked and slightly fed up" persona, powered by Google's Gemini model.
-   **Tool Integration**:
    -   **External Tools**: Seamlessly accesses on-chain data tools from the Flipside Crypto MCP server.
    -   **Local Tools**: Includes a custom `weatherTool` to fetch weather forecasts.
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
2.  Open the `.env` file and add your keys. You will need a `DISCORD_BOT_TOKEN` from the Discord Developer Portal and a `FLIPSIDE_API_KEY` from Flipside Crypto.
    Your `.env` file should look like this:
    ```.env
    DISCORD_TOKEN="your_discord_token_here"
    FLIPSIDE_API_KEY="your_flipside_api_key_here"
    ```

### 5. Start the Bot

This command runs the built application from the .mastra/output directory.

```bash
pnpm run start
```

## Running the Discord Bot (backup)

To run the bot in a development environment using `tsx` for on-the-fly TypeScript execution, use the following command:

```bash
pnpm exec tsx src/main.ts
```

Once executed, you will see a confirmation message in your console, and the bot should appear online in Discord.