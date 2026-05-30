import { readFile } from "node:fs/promises";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  CmsAgentError,
  loadDeveloperContent,
  publishContent,
  saveDraft,
} from "@/lib/cms-agent";
import { setFieldValue } from "@/lib/cms-agent/field-ops";
import type { CmsAgentConfig } from "@/lib/cms-agent/types";
import {
  createCmsAgentClient,
  listContent,
  unwrapCmsResult,
} from "./client.js";

type Args = Record<string, unknown>;

function text(content: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: typeof content === "string" ? content : JSON.stringify(content, null, 2),
      },
    ],
  };
}

function errorText(err: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

function requireString(args: Args, key: string, fallback?: string): string {
  const v = args[key] ?? fallback;
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`"${key}" is required and must be a non-empty string`);
  }
  return v;
}

function snapshotToMcpRecord(snap: Awaited<ReturnType<typeof loadDeveloperContent>>) {
  return {
    id: snap.id,
    siteId: snap.siteId,
    contentType: snap.contentType,
    title: snap.title,
    slug: snap.slug,
    status: snap.status,
    dataJson: snap.data,
    fieldFormats: snap.fieldFormats,
    updatedAt: snap.updatedAt,
    publishedAt: snap.publishedAt,
  };
}

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: "cms_list_content",
    description:
      "List content items for a site + contentType. Returns id, title, slug, status for each item. Use this to discover content IDs before other operations.",
    inputSchema: {
      type: "object",
      properties: {
        site_id: {
          type: "string",
          description: "Site slug or ID (default: main-site)",
        },
        content_type: {
          type: "string",
          description: "Content type slug, e.g. topPage",
        },
      },
      required: ["content_type"],
    },
  },
  {
    name: "cms_get_content",
    description:
      "Get a single content record including dataJson (field values) and fieldFormats (plain/richText per path). Call this before editing to see the current state.",
    inputSchema: {
      type: "object",
      properties: {
        site_id: { type: "string", description: "Site slug (default: main-site)" },
        content_type: { type: "string", description: "Content type slug" },
        id: { type: "string", description: "Content record ID" },
      },
      required: ["content_type", "id"],
    },
  },
  {
    name: "cms_save_draft",
    description:
      "Save the full dataJson + fieldFormats as a draft (does NOT publish). Provide the full updated data object.",
    inputSchema: {
      type: "object",
      properties: {
        site_id: { type: "string", description: "Site slug (default: main-site)" },
        content_type: { type: "string", description: "Content type slug" },
        id: { type: "string", description: "Content record ID" },
        data: {
          type: "object",
          description: "Full dataJson object to save",
        },
        field_formats: {
          type: "object",
          description:
            'fieldFormats map: { "hero.title": "plain", "hero.body": "richText" }. Omit to leave unchanged.',
        },
        title: { type: "string", description: "Update title (optional)" },
        slug: { type: "string", description: "Update slug (optional)" },
      },
      required: ["content_type", "id", "data"],
    },
  },
  {
    name: "cms_publish",
    description:
      "Publish the content record. Triggers revalidateTag so the delivery API and front-end update immediately.",
    inputSchema: {
      type: "object",
      properties: {
        site_id: { type: "string", description: "Site slug (default: main-site)" },
        content_type: { type: "string", description: "Content type slug" },
        id: { type: "string", description: "Content record ID" },
      },
      required: ["content_type", "id"],
    },
  },
  {
    name: "cms_set_field",
    description:
      "Set a single field path value inside dataJson. Fetches current content, patches the path, and saves as draft. Optionally set format ('plain' | 'richText').",
    inputSchema: {
      type: "object",
      properties: {
        site_id: { type: "string", description: "Site slug (default: main-site)" },
        content_type: { type: "string", description: "Content type slug" },
        id: { type: "string", description: "Content record ID" },
        path: {
          type: "string",
          description: "Dot-notation field path, e.g. hero.title",
        },
        value: {
          description: "Value to set (string, number, boolean, object, or array)",
        },
        format: {
          type: "string",
          enum: ["plain", "richText"],
          description: "Optional: update fieldFormats for this path",
        },
      },
      required: ["content_type", "id", "path", "value"],
    },
  },
  {
    name: "cms_add_field",
    description:
      "Add a new field group (name + paths + initial values) to dataJson and fieldFormats. Equivalent to clicking 'Add Field' on the developer page.",
    inputSchema: {
      type: "object",
      properties: {
        site_id: { type: "string", description: "Site slug (default: main-site)" },
        content_type: { type: "string", description: "Content type slug" },
        id: { type: "string", description: "Content record ID" },
        paths: {
          type: "array",
          items: { type: "string" },
          description:
            'Field paths to register, e.g. ["hero.title", "hero.text", "hero.image"]',
        },
        initial_values: {
          type: "object",
          description:
            'Optional initial values keyed by path, e.g. { "hero.title": "Welcome" }',
        },
        formats: {
          type: "object",
          description:
            'Optional fieldFormats per path, e.g. { "hero.title": "plain", "hero.text": "richText" }. Defaults to \'plain\'.',
        },
      },
      required: ["content_type", "id", "paths"],
    },
  },
  {
    name: "cms_upload_asset",
    description:
      "Upload a local image file as a site asset. Returns the asset URL which can then be set as a field value via cms_set_field.",
    inputSchema: {
      type: "object",
      properties: {
        site_id: { type: "string", description: "Site slug (default: main-site)" },
        file_path: {
          type: "string",
          description: "Absolute or relative path to the local image file",
        },
        alt: { type: "string", description: "Alt text for the image (optional)" },
      },
      required: ["file_path"],
    },
  },
];

export async function handleToolCall(
  config: CmsAgentConfig,
  defaultSiteId: string,
  toolName: string,
  args: Args,
): Promise<ReturnType<typeof text>> {
  try {
    const siteId = (typeof args["site_id"] === "string" && args["site_id"]) || defaultSiteId;
    const cms = createCmsAgentClient(config);

    switch (toolName) {
      case "cms_list_content": {
        const contentType = requireString(args, "content_type");
        const items = await listContent(config, siteId, contentType);
        return text(items);
      }

      case "cms_get_content": {
        const contentType = requireString(args, "content_type");
        const id = requireString(args, "id");
        const snap = await loadDeveloperContent(siteId, contentType, id, config);
        return text(snapshotToMcpRecord(snap));
      }

      case "cms_save_draft": {
        const contentType = requireString(args, "content_type");
        const id = requireString(args, "id");
        if (!args["data"] || typeof args["data"] !== "object" || Array.isArray(args["data"])) {
          throw new Error('"data" must be a JSON object');
        }

        const current = await loadDeveloperContent(siteId, contentType, id, config);
        const snap = await saveDraft(
          {
            siteId,
            contentType,
            id,
            data: args["data"] as Record<string, unknown>,
            fieldFormats:
              args["field_formats"] && typeof args["field_formats"] === "object"
                ? (args["field_formats"] as Record<string, "plain" | "richText">)
                : current.fieldFormats,
            title: typeof args["title"] === "string" ? args["title"] : current.title,
            slug: typeof args["slug"] === "string" ? args["slug"] : current.slug,
          },
          config,
        );
        return text(snapshotToMcpRecord(snap));
      }

      case "cms_publish": {
        const contentType = requireString(args, "content_type");
        const id = requireString(args, "id");
        const current = await loadDeveloperContent(siteId, contentType, id, config);
        const snap = await publishContent(
          {
            siteId,
            contentType,
            id,
            data: current.data,
            fieldFormats: current.fieldFormats,
            title: current.title,
            slug: current.slug,
          },
          config,
        );
        return text(snapshotToMcpRecord(snap));
      }

      case "cms_set_field": {
        const contentType = requireString(args, "content_type");
        const id = requireString(args, "id");
        const path = requireString(args, "path");
        if (!("value" in args)) throw new Error('"value" is required');

        const current = await loadDeveloperContent(siteId, contentType, id, config);
        const updatedData = setFieldValue(current.data, path, args["value"]);

        let fieldFormats = current.fieldFormats;
        if (typeof args["format"] === "string") {
          const fmt = args["format"];
          if (fmt !== "plain" && fmt !== "richText") {
            throw new Error('"format" must be "plain" or "richText"');
          }
          fieldFormats = { ...fieldFormats, [path]: fmt };
        }

        const snap = await saveDraft(
          {
            siteId,
            contentType,
            id,
            data: updatedData,
            fieldFormats,
            title: current.title,
            slug: current.slug,
          },
          config,
        );
        return text({ path, value: args["value"], saved: snap.status });
      }

      case "cms_add_field": {
        const contentType = requireString(args, "content_type");
        const id = requireString(args, "id");

        if (!Array.isArray(args["paths"]) || args["paths"].length === 0) {
          throw new Error('"paths" must be a non-empty array of strings');
        }
        const paths = args["paths"] as string[];

        const current = await loadDeveloperContent(siteId, contentType, id, config);
        const initialValues =
          args["initial_values"] && typeof args["initial_values"] === "object"
            ? (args["initial_values"] as Record<string, unknown>)
            : {};
        const formats =
          args["formats"] && typeof args["formats"] === "object"
            ? (args["formats"] as Record<string, "plain" | "richText">)
            : {};

        let updatedData = current.data;
        const updatedFormats = { ...current.fieldFormats };

        for (const p of paths) {
          const initVal = p in initialValues ? initialValues[p] : "";
          updatedData = setFieldValue(updatedData, p, initVal);
          updatedFormats[p] = formats[p] ?? "plain";
        }

        const snap = await saveDraft(
          {
            siteId,
            contentType,
            id,
            data: updatedData,
            fieldFormats: updatedFormats,
            title: current.title,
            slug: current.slug,
          },
          config,
        );
        return text({ addedPaths: paths, saved: snap.status });
      }

      case "cms_upload_asset": {
        const filePath = requireString(args, "file_path");
        const alt = typeof args["alt"] === "string" ? args["alt"] : undefined;
        const fileBuffer = await readFile(filePath);
        const filename = filePath.split("/").pop() ?? "upload";
        const blob = new Blob([fileBuffer]);
        const asset = unwrapCmsResult(
          await cms.uploadAsset(siteId, blob, { alt, filename }),
        );
        return text(asset);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (err) {
    if (err instanceof CmsAgentError) {
      return errorText(err);
    }
    return errorText(err);
  }
}
