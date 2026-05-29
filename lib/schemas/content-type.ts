import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  ArrayField,
  BooleanField,
  ContentFieldDefinition,
  ContentFieldOption,
  ContentTypeDefinition,
  ContentTypeKind,
  ImageField,
  NumberField,
  ObjectField,
  ReferenceField,
  SectionArrayField,
  SectionTemplate,
  SelectField,
  TextField,
} from "./content-field";
import { contentFieldTypes, contentTypeKinds } from "./content-field";

const nameSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-zA-Z0-9]*$/, "Use camelCase or lower camelCase names.");

const optionSchema: z.ZodType<ContentFieldOption> = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

let contentFieldSchema: z.ZodType<ContentFieldDefinition>;

const sectionTemplateSchema: z.ZodType<SectionTemplate> = z.lazy(() =>
  z.object({
    type: nameSchema,
    label: z.string().min(1),
    description: z.string().min(1).optional(),
    fields: z.array(contentFieldSchema).optional(),
  }),
);

const baseFieldSchema = z.object({
  name: nameSchema,
  label: z.string().min(1),
  required: z.boolean().optional(),
  hidden: z.boolean().optional(),
  description: z.string().min(1).optional(),
  defaultValue: z.unknown().optional(),
});

const textFieldSchema = baseFieldSchema.extend({
  type: z.enum(["text", "textarea", "richText", "url", "date"]),
});

const numberFieldSchema = baseFieldSchema.extend({
  type: z.literal("number"),
});

const booleanFieldSchema = baseFieldSchema.extend({
  type: z.literal("boolean"),
});

const imageFieldSchema = baseFieldSchema.extend({
  type: z.enum(["image", "file"]),
});

const selectFieldSchema = baseFieldSchema.extend({
  type: z.literal("select"),
  options: z.array(optionSchema).min(1),
});

const referenceFieldSchema = baseFieldSchema.extend({
  type: z.literal("reference"),
  targetApiName: nameSchema,
  multiple: z.boolean().optional(),
});

const arrayFieldSchema = baseFieldSchema.extend({
  type: z.literal("array"),
  item: z.lazy(() => contentFieldSchema),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().positive().optional(),
});

const objectFieldSchema = baseFieldSchema.extend({
  type: z.literal("object"),
  fields: z.array(z.lazy(() => contentFieldSchema)).min(1),
});

const sectionArrayFieldSchema = baseFieldSchema.extend({
  type: z.literal("sectionArray"),
  allowedSections: z.array(sectionTemplateSchema).min(1),
});

contentFieldSchema = z.lazy(() =>
  z.discriminatedUnion("type", [
    textFieldSchema,
    numberFieldSchema,
    booleanFieldSchema,
    imageFieldSchema,
    selectFieldSchema,
    referenceFieldSchema,
    arrayFieldSchema,
    objectFieldSchema,
    sectionArrayFieldSchema,
  ]),
);

export const contentTypeDefinitionSchema: z.ZodType<ContentTypeDefinition> = z
  .object({
    apiName: nameSchema,
    label: z.string().min(1),
    type: z.enum(contentTypeKinds),
    description: z.string().min(1).optional(),
    listViewFields: z.array(z.string().min(1)).optional(),
    fields: z.array(contentFieldSchema).min(1),
  })
  .superRefine((definition, ctx) => {
    const uniqueFieldNames = new Set<string>();

    for (const field of definition.fields) {
      if (uniqueFieldNames.has(field.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate field name: ${field.name}`,
          path: ["fields"],
        });
        break;
      }

      uniqueFieldNames.add(field.name);
    }
  });

export interface ContentTypeFileRecord {
  filePath: string;
  definition: ContentTypeDefinition;
}

export function parseContentTypeDefinition(
  raw: unknown,
): ContentTypeDefinition {
  return contentTypeDefinitionSchema.parse(raw);
}

export async function readContentTypeDefinition(
  filePath: string,
): Promise<ContentTypeDefinition> {
  const fileContents = await readFile(filePath, "utf8");
  return parseContentTypeDefinition(JSON.parse(fileContents) as unknown);
}

export async function readContentTypeDefinitions(
  directory = path.join(process.cwd(), "content-types"),
): Promise<ContentTypeFileRecord[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const definitions = await Promise.all(
    jsonFiles.map(async (filePath) => ({
      filePath,
      definition: await readContentTypeDefinition(filePath),
    })),
  );

  return definitions;
}

export function getContentTypeFilePath(
  apiName: string,
  directory = path.join(process.cwd(), "content-types"),
): string {
  return path.join(directory, `${apiName}.json`);
}

export { contentFieldSchema, contentFieldTypes, contentTypeKinds };
