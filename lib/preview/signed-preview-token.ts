import { createHmac, timingSafeEqual } from "node:crypto";

const PREVIEW_TOKEN_PREFIX = "pt";
const PREVIEW_TOKEN_VERSION = "v1";
const DEFAULT_TTL_SECONDS = 86_400;

export interface SignedPreviewPayload {
  siteId: string;
  exp: number;
}

function getPreviewTokenSecret(): string | null {
  const secret = process.env.PREVIEW_TOKEN_SECRET?.trim();
  return secret || null;
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function computeSignature(version: string, payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(`${version}.${payloadB64}`).digest("base64url");
}

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function hasPreviewTokenSecret(): boolean {
  return getPreviewTokenSecret() !== null;
}

export function isSignedPreviewTokenFormat(token: string): boolean {
  return token.startsWith(`${PREVIEW_TOKEN_PREFIX}.`);
}

/**
 * HMAC 署名付きプレビュートークンを生成する（pt.v1.{payload}.{sig}）。
 */
export function createSignedPreviewToken(
  siteId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string | null {
  const secret = getPreviewTokenSecret();
  if (!secret) {
    return null;
  }

  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: SignedPreviewPayload = { siteId, exp };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = computeSignature(PREVIEW_TOKEN_VERSION, payloadB64, secret);

  return [PREVIEW_TOKEN_PREFIX, PREVIEW_TOKEN_VERSION, payloadB64, signature].join(".");
}

/**
 * 署名付きプレビュートークンを検証する。siteId 不一致・期限切れ・改ざんは false。
 */
export function verifySignedPreviewToken(token: string, siteId: string): boolean {
  const secret = getPreviewTokenSecret();
  if (!secret || !isSignedPreviewTokenFormat(token)) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== PREVIEW_TOKEN_PREFIX) {
    return false;
  }

  const [, version, payloadB64, providedSignature] = parts;
  if (version !== PREVIEW_TOKEN_VERSION || !payloadB64 || !providedSignature) {
    return false;
  }

  const expectedSignature = computeSignature(version, payloadB64, secret);
  if (!timingSafeEqualString(providedSignature, expectedSignature)) {
    return false;
  }

  let payload: SignedPreviewPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as SignedPreviewPayload;
  } catch {
    return false;
  }

  if (payload.siteId !== siteId || typeof payload.exp !== "number") {
    return false;
  }

  return payload.exp >= Math.floor(Date.now() / 1000);
}
