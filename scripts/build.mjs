import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'WithCode.standalone.js');
const outDir = join(root, 'dist');
const out = join(outDir, 'WithCode.standalone.min.js');

const code = readFileSync(src, 'utf8');
const result = await minify(code, {
    compress: {
        dead_code: true,
        drop_console: false,
        passes: 2
    },
    mangle: false,
    format: {
        comments: /^!/,
        max_line_len: false
    }
});

if (result.error) {
    console.error(result.error);
    process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(out, result.code, 'utf8');
console.log('Wrote', out, '(' + Buffer.byteLength(result.code, 'utf8') + ' bytes)');
