import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { createDarvishiAgent } from './agents/darvishi-agent';
import { createLyraAgent } from './agents/lyra-agent';

const logger = new PinoLogger({
  name: 'Mastra',
  level: 'info',
});

export { logger };

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: {
    darvishiAgent: createDarvishiAgent(true), // Default to summarized tools
    lyraAgent: createLyraAgent(false), // Default to summarized tools
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: logger,
  telemetry: {
    serviceName: "braintrust",
    enabled: true,
    export: {
      type: "otlp",
    },
  },
});