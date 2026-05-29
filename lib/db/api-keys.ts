import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";

export function hashApiKeySecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function createApiKeySecret(prefix: string): {
  prefix: string;
  secret: string;
  keyHash: string;
} {
  const secret = `${prefix}_${randomBytes(24).toString("hex")}`;
  return {
    prefix: secret.slice(0, 12),
    secret,
    keyHash: hashApiKeySecret(secret),
  };
}

export type RotateSiteApiKeysSuccess = {
  ok: true;
  apiKeys: {
    public: string;
    admin: string;
  };
};

export type RotateSiteApiKeysFailure = {
  ok: false;
  status: 404;
  code: string;
  error: string;
};

export type RotateSiteApiKeysResult = RotateSiteApiKeysSuccess | RotateSiteApiKeysFailure;

export async function rotateSiteApiKeys(siteIdOrSlug: string): Promise<RotateSiteApiKeysResult> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return {
      ok: false,
      status: 404,
      code: "site_not_found",
      error: "Site was not found.",
    };
  }

  const publicKey = createApiKeySecret("public");
  const adminKey = createApiKeySecret("admin");
  const revokedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.apiKey.updateMany({
      where: {
        siteId,
        revokedAt: null,
      },
      data: { revokedAt },
    });

    await tx.apiKey.createMany({
      data: [
        {
          siteId,
          name: "Public API key",
          kind: "public",
          prefix: publicKey.prefix,
          keyHash: publicKey.keyHash,
        },
        {
          siteId,
          name: "Admin API key",
          kind: "admin",
          prefix: adminKey.prefix,
          keyHash: adminKey.keyHash,
        },
      ],
    });
  });

  return {
    ok: true,
    apiKeys: {
      public: publicKey.secret,
      admin: adminKey.secret,
    },
  };
}
