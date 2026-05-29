export const contentFieldTypes = [
  "text",
  "textarea",
  "richText",
  "number",
  "boolean",
  "image",
  "file",
  "url",
  "date",
  "select",
  "reference",
  "array",
  "object",
  "sectionArray",
] as const;

export type ContentFieldType = (typeof contentFieldTypes)[number];

export interface ContentFieldBase {
  name: string;
  label: string;
  type: ContentFieldType;
  required?: boolean;
  hidden?: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface ContentFieldOption {
  label: string;
  value: string;
}

export interface TextField extends ContentFieldBase {
  type: "text" | "textarea" | "richText" | "url" | "date";
}

export interface NumberField extends ContentFieldBase {
  type: "number";
}

export interface BooleanField extends ContentFieldBase {
  type: "boolean";
}

export interface ImageField extends ContentFieldBase {
  type: "image" | "file";
}

export interface SelectField extends ContentFieldBase {
  type: "select";
  options: ContentFieldOption[];
}

export interface ReferenceField extends ContentFieldBase {
  type: "reference";
  targetApiName: string;
  multiple?: boolean;
}

export interface ArrayField extends ContentFieldBase {
  type: "array";
  item: ContentFieldDefinition;
  minItems?: number;
  maxItems?: number;
}

export interface ObjectField extends ContentFieldBase {
  type: "object";
  fields: ContentFieldDefinition[];
}

export interface SectionTemplate {
  type: string;
  label: string;
  description?: string;
  fields?: ContentFieldDefinition[];
}

export interface SectionArrayField extends ContentFieldBase {
  type: "sectionArray";
  allowedSections: SectionTemplate[];
}

export type ContentFieldDefinition =
  | TextField
  | NumberField
  | BooleanField
  | ImageField
  | SelectField
  | ReferenceField
  | ArrayField
  | ObjectField
  | SectionArrayField;

export const contentTypeKinds = ["single", "collection"] as const;

export type ContentTypeKind = (typeof contentTypeKinds)[number];

export interface ContentTypeDefinition {
  apiName: string;
  label: string;
  type: ContentTypeKind;
  description?: string;
  listViewFields?: string[];
  fields: ContentFieldDefinition[];
}
