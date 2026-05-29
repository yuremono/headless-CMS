import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const resolveSiteId = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  // unstable_cache はラップ対象の関数をそのまま実行する薄いスタブにする。
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: (...args: unknown[]) => resolveSiteId(...args),
}));

import {
  deliveryItemTag,
  deliveryListTag,
  resolveCanonicalSiteId,
  revalidateDeliveryContent,
} from "./delivery-tags";

describe("delivery タグ生成", () => {
  it("item/list タグを正準サイト ID から組み立てる", () => {
    expect(deliveryItemTag("site-1", "topPage", "c-1")).toBe("delivery:item:site-1:topPage:c-1");
    expect(deliveryListTag("site-1", "topPage")).toBe("delivery:list:site-1:topPage");
  });
});

describe("resolveCanonicalSiteId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("スラッグを正準 ID へ解決する", async () => {
    resolveSiteId.mockResolvedValue("site-canonical");
    await expect(resolveCanonicalSiteId("main-site")).resolves.toBe("site-canonical");
  });

  it("解決できない場合は入力値をそのまま返す", async () => {
    resolveSiteId.mockResolvedValue(null);
    await expect(resolveCanonicalSiteId("unknown")).resolves.toBe("unknown");
  });
});

describe("revalidateDeliveryContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSiteId.mockResolvedValue("site-canonical");
  });

  it("id/slug 指定時は item(両方) と list タグを expire:0 で失効させる", async () => {
    await revalidateDeliveryContent("main-site", "topPage", { id: "c-1", slug: "top" });

    const tags = revalidateTag.mock.calls.map((call) => call[0]);
    expect(tags).toContain("delivery:list:site-canonical:topPage");
    expect(tags).toContain("delivery:item:site-canonical:topPage:c-1");
    expect(tags).toContain("delivery:item:site-canonical:topPage:top");
    for (const call of revalidateTag.mock.calls) {
      expect(call[1]).toEqual({ expire: 0 });
    }
  });

  it("id/slug 未指定なら list タグのみ失効させる", async () => {
    await revalidateDeliveryContent("main-site", "topPage");

    const tags = revalidateTag.mock.calls.map((call) => call[0]);
    expect(tags).toEqual(["delivery:list:site-canonical:topPage"]);
  });
});
