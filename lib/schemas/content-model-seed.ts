import { Prisma } from "@prisma/client";
import type { ContentTypeDefinition } from "./content-field";

export interface ContentModelSeedRecord {
  siteId: string;
  name: string;
  apiName: string;
  type: "single" | "collection";
  schemaJson: Prisma.InputJsonValue;
}

export function buildContentModelSeedRecords(
  siteId: string,
  definitions: ContentTypeDefinition[],
): ContentModelSeedRecord[] {
  return definitions.map((definition) => ({
    siteId,
    name: definition.label,
    apiName: definition.apiName,
    type: definition.type,
    schemaJson: definition as unknown as Prisma.InputJsonValue,
  }));
}
