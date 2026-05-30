# headless-cms MCP Server

MCP server for AI agent operations on the headless CMS.  
Uses shared [`lib/cms-agent`](../../lib/cms-agent/) (content-ops, field-ops, api-client) — same write path as the developer page and `npm run cms:cli`.

## Setup

```bash
# From the repository root (tsx + @/ path alias require root install):
npm install

# MCP-local SDK deps (optional if only using root npm run cms:mcp):
cd mcp/headless-cms && npm install
```

Run the server from the **repo root** so `tsx` resolves `@/lib/cms-agent`:

```bash
npm run cms:mcp
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CMS_ADMIN_API_KEY` | **Yes** | — | Admin API key (`x-api-key` header, same as CLI) |
| `CMS_BASE_URL` | No | `http://localhost:3000` | CMS origin (local or production) |
| `CMS_SITE_ID` | No | `main-site` | Default site slug |

Auth uses `x-api-key` (not `Authorization: Bearer`), matching `lib/cms-agent/api-client`.

## Cursor MCP Config

Add to `~/.cursor/mcp.json` (or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "headless-cms": {
      "command": "npx",
      "args": ["tsx", "/ABSOLUTE/PATH/TO/0529headless/mcp/headless-cms/src/server.ts"],
      "cwd": "/ABSOLUTE/PATH/TO/0529headless",
      "env": {
        "CMS_ADMIN_API_KEY": "your-admin-api-key",
        "CMS_BASE_URL": "http://localhost:3000",
        "CMS_SITE_ID": "main-site"
      }
    }
  }
}
```

For production:

```json
{
  "mcpServers": {
    "headless-cms": {
      "command": "npx",
      "args": ["tsx", "/ABSOLUTE/PATH/TO/0529headless/mcp/headless-cms/src/server.ts"],
      "cwd": "/ABSOLUTE/PATH/TO/0529headless",
      "env": {
        "CMS_ADMIN_API_KEY": "your-admin-api-key",
        "CMS_BASE_URL": "https://0529headless-cms.vercel.app",
        "CMS_SITE_ID": "main-site"
      }
    }
  }
}
```

> **Note**: `npx tsx` requires `tsx` to be installed globally or in the root project's `node_modules`.  
> From the repo root: `npm install` installs tsx as a devDependency.

### Alternative: run via npm script

```json
{
  "mcpServers": {
    "headless-cms": {
      "command": "npm",
      "args": ["run", "cms:mcp"],
      "cwd": "/ABSOLUTE/PATH/TO/0529headless",
      "env": {
        "CMS_ADMIN_API_KEY": "your-admin-api-key"
      }
    }
  }
}
```

## Available Tools

### `cms_list_content`
List content items. Use this first to discover content IDs.

```
site_id       (optional) Site slug. Default: main-site
content_type  (required) Content type slug, e.g. topPage
```

### `cms_get_content`
Get a single content record with `dataJson` and `fieldFormats`.

```
site_id       (optional)
content_type  (required)
id            (required) Content record ID
```

### `cms_save_draft`
Save full `dataJson` as draft (does not publish).

```
site_id        (optional)
content_type   (required)
id             (required)
data           (required) Full dataJson object
field_formats  (optional) { "path": "plain"|"richText" }
title          (optional)
slug           (optional)
```

### `cms_publish`
Publish the content record. Triggers `revalidateTag` for immediate delivery API update.

```
site_id       (optional)
content_type  (required)
id            (required)
```

### `cms_set_field`
Set a single field path value. Fetches current content, updates the path, saves as draft.

```
site_id       (optional)
content_type  (required)
id            (required)
path          (required) Dot-notation path, e.g. hero.title
value         (required) Any JSON value
format        (optional) "plain" | "richText"
```

### `cms_add_field`
Add new field paths to `dataJson` and `fieldFormats` (equivalent to 'Add Field' on developer page).

```
site_id        (optional)
content_type   (required)
id             (required)
paths          (required) Array of dot-notation paths, e.g. ["hero.title", "hero.text"]
initial_values (optional) { "hero.title": "Welcome" }
formats        (optional) { "hero.title": "plain", "hero.text": "richText" }
```

### `cms_upload_asset`
Upload a local image file as a site asset. Returns the asset record including URL.

```
site_id   (optional)
file_path (required) Absolute or relative path to the local image file
alt       (optional) Alt text
```

## Typical Workflow

```
1. cms_list_content  → discover content IDs
2. cms_get_content   → inspect current dataJson + fieldFormats
3. cms_add_field     → add new field group with paths
4. cms_set_field     → update individual field values
5. cms_save_draft    → save full data as draft (optional intermediate step)
6. cms_publish       → publish and propagate to delivery API
7. cms_upload_asset  → upload an image, then set its URL via cms_set_field
```
