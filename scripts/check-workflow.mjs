/**
 * 驗證 Gitea lint workflow 與 TypeScript 來源對齊：
 * - Node 釘在 22.23.4（避免 EOL 18.x／CVE-2026-111497）
 * - paths 監聽 .ts 來源而非已移除的 .js
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { strict as assert } from 'assert';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(root, '.gitea', 'workflows', 'lint.yaml');
const text = readFileSync(yamlPath, 'utf8');

assert.match(text, /node-version:\s*'22\.23\.4'/, 'node-version 必須釘在 22.23.4');
assert.doesNotMatch(text, /node-version:\s*'18/, '不得再使用 Node 18.x');
assert.match(text, /^\s*-\s+WithCode\.standalone\.ts\s*$/m, 'paths 必須包含 WithCode.standalone.ts');
assert.doesNotMatch(text, /^\s*-\s+WithCode\.standalone\.js\s*$/m, 'paths 不得再監聽已移除的 WithCode.standalone.js');
assert.match(text, /^\s*-\s+TelegramAPI\.ts\s*$/m, 'paths 必須包含 TelegramAPI.ts');
assert.match(text, /^\s*-\s+tsconfig\.json\s*$/m, 'paths 必須包含 tsconfig.json');

console.log('check-workflow: ok');
