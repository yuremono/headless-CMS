import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

const APP_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createAppSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const expires = new Date(Date.now() + APP_SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

export async function validateAppSession(token: string): Promise<{
  userId: string;
  sessionToken: string;
  email: string | null;
} | null> {
  const row = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!row || row.expires <= new Date()) {
    if (row) {
      await prisma.session.delete({ where: { id: row.id } }).catch(() => undefined);
    }
    return null;
  }

  return {
    userId: row.user.id,
    sessionToken: row.sessionToken,
    email: row.user.email,
  };
}

export async function revokeAppSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { sessionToken: token },
  });
}
