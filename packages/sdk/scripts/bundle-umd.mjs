/**
 * Produces dist/bio-sdk.umd.js (IIFE with window.BioSDK) after tsup's main build.
 * Kept separate because tsup's iife output doesn't support the globalName pattern we need.
 */
import { build } from 'esbuild';
import { gzipSync } from 'zlib';
import { readFileSync } from 'fs';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'BioSDK',
  outfile: 'dist/bio-sdk.umd.js',
  minify: true,
  sourcemap: true,
  target: ['es2017', 'chrome80', 'firefox75', 'safari13'],
  // The UMD build must be self-contained — no external deps
  // @bio-sdk/protocol types are inlined at build time
  external: [],
});

const raw = readFileSync('dist/bio-sdk.umd.js');
const gz = gzipSync(raw);
console.log(
  `UMD bundle: ${(raw.length / 1024).toFixed(1)} kB  /  ${(gz.length / 1024).toFixed(1)} kB gzip`,
);
