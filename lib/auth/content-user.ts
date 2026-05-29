/** Content / Asset の createdBy・updatedBy 用 User FK。合成 actorId は null。 */
export function resolveContentUserId(context: {
  actorId: string;
  userId?: string;
}): string | null {
  if (context.userId) {
    return context.userId;
  }

  if (!context.actorId || context.actorId.includes(":")) {
    return null;
  }

  return context.actorId;
}
