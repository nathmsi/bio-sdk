import { build } from 'esbuild';
import { gzipSync } from 'zlib';
import { readFileSync } from 'fs';

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: ['es2017', 'chrome80', 'firefox75', 'safari13'],
};

await build({
  ...shared,
  format: 'esm',
  outfile: 'dist/bio-sdk.esm.js',
  minify: true,
});

await build({
  ...shared,
  format: 'iife',
  globalName: 'BioSDK',
  outfile: 'dist/bio-sdk.umd.js',
  minify: true,
});

// Print bundle sizes
for (const file of ['dist/bio-sdk.esm.js', 'dist/bio-sdk.umd.js']) {
  const raw  = readFileSync(file);
  const gz   = gzipSync(raw);
  console.log(`${file.padEnd(28)} ${(raw.length / 1024).toFixed(1)} kB  (${(gz.length / 1024).toFixed(1)} kB gzip)`);
}

console.log('\n✅ Build complete');
