/**
 * lib/cms-agent — サーバーサイド（CLI/MCP）向け CMS 操作の公開 API。
 * サブモジュールを直接 import せず、この index から利用する。
 */

export { buildContentWriteBody, createCmsAgentClient } from './api-client';
export type { CmsAgentClient } from './api-client';

export {
  CmsAgentError,
  buildRepeatableArrayValue,
  collectComposableFieldFormats,
  loadDeveloperContent,
  mergeDataForSave,
  publishContent,
  restoreGroupsFromData,
  saveDraft,
  writeFieldValue,
} from './content-ops';

export type {
  CmsAgentOptions,
  ComposableFieldFormat,
  ComposableFieldGroup,
  ContentSaveParams,
  DeveloperContentSnapshot,
} from './content-ops';

export {
  addFieldGroup,
  duplicateFieldInData,
  removeFieldGroup,
  renameFieldPrefix,
  setFieldValue,
} from './field-ops';

export type {
  DuplicateFieldResult,
  FieldOpsResult,
  FieldPathSpec,
} from './field-ops';

export type {
  AdminUiContentRecord,
  AssetRecord,
  CmsAgentConfig,
  CmsClientResult,
  ContentRecord,
  ContentSchemaRecord,
  ContentStatus,
  ContentWriteInput,
  FieldFormat,
  FieldManifest,
  FieldManifestEntry,
  FieldType,
} from './types';
