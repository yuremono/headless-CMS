/**
 * CMS CLI エントリーポイント
 * developer ページと同等の CMS 操作をコマンドラインから実行する。
 *
 * 使用例:
 *   npm run cms -- content get --site main-site --type topPage
 *   npm run cms -- content save --file data.json
 *   npm run cms -- content publish
 *   npm run cms -- field set --path hero.title --value "Hello"
 *   npm run cms -- field add --name hero --paths title,text,image
 *   npm run cms -- asset upload --file ./photo.jpg
 *
 * スモーク（dev サーバー不要）:
 *   npm run cms -- --help
 *
 * 禁止操作: migrate reset / seed / raw SQL
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  contentGet,
  contentPublish,
  contentSave,
  fieldAdd,
  fieldSet,
  assetUpload,
  outputError,
} from './cms-cli/commands';

// .env.local を優先ロード（存在しなければ .env にフォールバック）
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// ---------------------------------------------------------------------------
// 危険な操作のガード
// ---------------------------------------------------------------------------

const BLOCKED_SUBCOMMANDS = new Set(['reset', 'seed', 'sql', 'migrate']);

// ---------------------------------------------------------------------------
// 引数パース
// ---------------------------------------------------------------------------

let parsed: ReturnType<typeof parseArgs>;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    options: {
      site: { type: 'string', default: 'main-site' },
      type: { type: 'string', default: 'topPage' },
      id: { type: 'string' },
      file: { type: 'string' },
      draft: { type: 'boolean', default: false },
      path: { type: 'string' },
      value: { type: 'string' },
      name: { type: 'string' },
      paths: { type: 'string' },
      rich: { type: 'boolean', default: false },
      'base-url': { type: 'string' },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
} catch (err) {
  outputError('invalid_args', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const { values, positionals } = parsed;
const [group, subcommand] = positionals;

// ---------------------------------------------------------------------------
// ヘルプ
// ---------------------------------------------------------------------------

function printHelp(): void {
  process.stdout.write(
    [
      'CMS CLI — developer ページ相当の操作をコマンドラインから実行',
      '',
      '使用方法:',
      '  npm run cms -- <group> <command> [options]',
      '',
      'コマンド:',
      '  content get     --site <site> --type <type> [--id <id>]',
      '  content save    --site <site> --type <type> --file <json> [--id <id>] [--draft]',
      '  content publish --site <site> --type <type> [--id <id>]',
      '  field set       --site <site> --type <type> --path <path> --value <val> [--id <id>]',
      '  field add       --site <site> --type <type> --name <name> --paths <p1,p2> [--rich] [--id <id>]',
      '  asset upload    --site <site> --file <path>',
      '',
      'オプション:',
      '  --site       サイト ID またはスラッグ（デフォルト: main-site）',
      '  --type       コンテンツタイプ（デフォルト: topPage）',
      '  --id         コンテンツ ID（省略時は単一コンテンツを自動解決）',
      '  --file       JSON ファイルパス（content save / asset upload）',
      '  --draft      保存時にステータスを draft にする',
      '  --path       フィールドパス（例: hero.title）',
      '  --value      フィールド値（JSON 文字列も可）',
      '  --name       フィールド名（field add）',
      '  --paths      サブパスのカンマ区切り（field add）',
      '  --rich       richText フォーマットで登録（field add）',
      '  --base-url   API ベース URL（デフォルト: $CMS_BASE_URL or $APP_URL or localhost:3000）',
      '',
      '環境変数:',
      '  CMS_ADMIN_API_KEY   管理 API キー（本番必須）',
      '  CMS_BASE_URL        API サーバーの URL',
      '  APP_URL             CMS_BASE_URL が未設定の場合のフォールバック',
      '',
    ].join('\n'),
  );
}

if (values.help || !group) {
  printHelp();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// ガード
// ---------------------------------------------------------------------------

if (subcommand && BLOCKED_SUBCOMMANDS.has(subcommand)) {
  outputError(
    'blocked_command',
    `"${group} ${subcommand}" は CLI からの実行が禁止されています（DB 直叩き / migrate reset / seed / raw SQL）。`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// コマンドディスパッチ
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = values;

  if (group === 'content' && subcommand === 'get') {
    await contentGet(args);
  } else if (group === 'content' && subcommand === 'save') {
    await contentSave(args);
  } else if (group === 'content' && subcommand === 'publish') {
    await contentPublish(args);
  } else if (group === 'field' && subcommand === 'set') {
    await fieldSet(args);
  } else if (group === 'field' && subcommand === 'add') {
    await fieldAdd(args);
  } else if (group === 'asset' && subcommand === 'upload') {
    await assetUpload(args);
  } else {
    outputError(
      'unknown_command',
      `不明なコマンドです: "${group}${subcommand ? ` ${subcommand}` : ''}"。--help で使用方法を確認してください。`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  outputError(
    err instanceof Error && 'code' in err ? (err as { code: string }).code : 'unexpected_error',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
