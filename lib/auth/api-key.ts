import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function validateStoredApiKey(
  siteIdOrSlug: string,
  providedToken: string,
  kind: "public" | "admin",
): Promise<boolean> {
  try {
    const siteId = await resolveSiteId(siteIdOrSlug);
    if (!siteId) {
      return false;
    }

    const key = await prisma.apiKey.findFirst({
      where: {
        siteId,
        kind,
        keyHash: hashSecret(providedToken),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!key) {
      return false;
    }

    void prisma.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);

    return true;
  } catch {
    return false;
  }
}

export async function validateStoredAdminApiKeyGlobal(providedToken: string): Promise<boolean> {
  try {
    const key = await prisma.apiKey.findFirst({
      where: {
        kind: "admin",
        keyHash: hashSecret(providedToken),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    return !!key;
  } catch {
    return false;
  }
}
