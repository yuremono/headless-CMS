import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { CmsAgentConfig } from "@headless/cms-agent/types";
import { TOOL_DEFINITIONS, handleToolCall } from "./tools.js";

const baseUrl = process.env["CMS_BASE_URL"] ?? "http://localhost:3000";
const apiKey = process.env["CMS_ADMIN_API_KEY"] ?? "";
const defaultSiteId = process.env["CMS_SITE_ID"] ?? "main-site";

if (!apiKey) {
  process.stderr.write(
    "[headless-cms MCP] CMS_ADMIN_API_KEY is required. Set it in your MCP server env config.\n",
  );
  process.exit(1);
}

const agentConfig: CmsAgentConfig = { baseUrl, apiKey };

const server = new Server(
  { name: "headless-cms", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(
    agentConfig,
    defaultSiteId,
    name,
    (args as Record<string, unknown>) ?? {},
  );
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    `[headless-cms MCP] Server ready. base=${baseUrl} site=${defaultSiteId}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[headless-cms MCP] Fatal: ${String(err)}\n`);
  process.exit(1);
});
