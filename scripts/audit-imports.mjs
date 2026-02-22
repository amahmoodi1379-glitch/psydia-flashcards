import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = 'src';
const ENTRYPOINTS = ['src/main.tsx'];
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css'];
const indexExt = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full));
      continue;
    }
    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      result.push(path.normalize(full));
    }
  }
  return result;
}

function resolveImport(fromFile, specifier) {
  let target;

  if (specifier.startsWith('@/')) {
    target = path.join('src', specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    target = path.join(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  const absolute = path.normalize(target);
  const candidates = [absolute, ...extensions.map((ext) => `${absolute}${ext}`), ...indexExt.map((idx) => path.join(absolute, idx))];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }
  return null;
}

const files = walk(SRC_ROOT);
const importRegex = /(?:import|export)\s+(?:[^'"`]*?from\s*)?['"]([^'"`]+)['"]|import\(['"]([^'"]+)['"]\)/g;

const graph = new Map(files.map((file) => [file, new Set()]));
const reverse = new Map(files.map((file) => [file, new Set()]));

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(importRegex)) {
    const specifier = match[1] || match[2];
    const resolved = resolveImport(file, specifier);
    if (!resolved || !graph.has(resolved)) {
      continue;
    }
    graph.get(file).add(resolved);
    reverse.get(resolved).add(file);
  }
}

const visited = new Set();
const queue = [...ENTRYPOINTS.map((entry) => path.normalize(entry))];
while (queue.length) {
  const file = queue.pop();
  if (visited.has(file) || !graph.has(file)) {
    continue;
  }
  visited.add(file);
  for (const dep of graph.get(file)) {
    queue.push(dep);
  }
}

const unreachable = files.filter((file) => !visited.has(file)).sort();
const unreferenced = files
  .filter((file) => reverse.get(file).size === 0 && !ENTRYPOINTS.includes(file) && !file.endsWith('vite-env.d.ts'))
  .sort();

console.log('=== Import Audit: Files unreachable from entrypoints ===');
unreachable.forEach((file) => console.log(file));

console.log('\n=== Import Audit: Files with zero references ===');
unreferenced.forEach((file) => console.log(file));
