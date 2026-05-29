import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  listAdminContents: vi.fn(),
  listAdminContentsUi: vi.fn(),
  createAdminContent: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn(),
}));

import {
  createAdminContent,
  listAdminContents,
  listAdminContentsUi,
  resolveAdminRequest,
} from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedListApi = vi.mocked(listAdminContents);
const mockedListUi = vi.mocked(listAdminContentsUi);
const mockedCreate = vi.mocked(createAdminContent);

const authOk = {
  ok: true as const,
  context: { mode: "admin" as const, siteId: "site-1", token: "k", scope: "write" as const, actorId: "admin:site-1" },
};

describe("GET /api/admin/sites/[siteId]/content/[contentType]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("format=api のとき listAdminContents を呼ぶ", async () => {
    mockedListApi.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    const response = await GET(
      new Request("https://example.com/api/admin/sites/site-1/content/news?format=api&limit=10"),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedListApi).toHaveBeenCalledWith("site-1", "news", expect.any(URLSearchParams));
    expect(mockedListUi).not.toHaveBeenCalled();
  });

  it("format 未指定時は UI 向け一覧", async () => {
    mockedListUi.mockResolvedValue([]);

    await GET(new Request("https://example.com/api/admin/sites/site-1/content/news"), {
      params: Promise.resolve({ siteId: "site-1", contentType: "news" }),
    });

    expect(mockedListUi).toHaveBeenCalledWith("site-1", "news");
  });
});

describe("POST /api/admin/sites/[siteId]/content/[contentType]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("作成成功時 201", async () => {
    mockedCreate.mockResolvedValue({
      id: "new-1",
      siteId: "site-1",
      contentType: "news",
      slug: "draft",
      title: "Draft",
      status: "draft",
      dataJson: {},
      createdBy: "admin:site-1",
      updatedBy: "admin:site-1",
      publishedAt: null,
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/content/news", {
        method: "POST",
        body: JSON.stringify({ title: "Draft" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news" }) },
    );

    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith(
      "site-1",
      "news",
      { title: "Draft" },
      null,
    );
  });

  it("不正ボディは 400", async () => {
    mockedCreate.mockResolvedValue(null);

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/content/news", {
        method: "POST",
        body: "not-json",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "invalid_request_body",
      error: "Request body must be a JSON object.",
    });
  });
});
