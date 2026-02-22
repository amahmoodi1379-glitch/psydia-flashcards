import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SRC_ROOT = path.resolve('src');
const ENTRYPOINTS = [path.resolve('src/main.tsx')];
const IGNORE_PREFIXES = [path.resolve('src/components/ui')];
const IGNORE_FILES = new Set([path.resolve('src/integrations/supabase/types.ts')]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) acc.push(path.resolve(full));
  }
  return acc;
}

const files = walk(SRC_ROOT);
const fileSet = new Set(files);
const options = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  baseUrl: path.resolve('.'),
  paths: { '@/*': ['src/*'] },
  strict: false,
  skipLibCheck: true,
};
const host = ts.createCompilerHost(options);
const program = ts.createProgram(files, options, host);

const unusedImportDiags = ts
  .getPreEmitDiagnostics(program)
  .filter((d) => [6133, 6192].includes(d.code) && d.file)
  .filter((d) => !d.file.fileName.includes('/src/components/ui/'))
  .map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
    return `${path.relative(process.cwd(), d.file.fileName)}:${line + 1}:${character + 1} - ${msg}`;
  });

const exportMap = new Map();
const usedByFile = new Map();

for (const sf of program.getSourceFiles()) {
  const file = path.resolve(sf.fileName);
  if (!fileSet.has(file)) continue;

  const exports = new Set();
  sf.forEachChild((node) => {
    if (ts.isExportAssignment(node)) exports.add('default');
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
      const mods = ts.getModifiers(node) || [];
      if (mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const isDefault = mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
        if (isDefault) exports.add('default');
        else if (node.name) exports.add(node.name.text);
      }
    }
    if (ts.isVariableStatement(node)) {
      const mods = ts.getModifiers(node) || [];
      if (mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name)) exports.add(d.name.text);
      }
    }

    if (ts.isImportDeclaration(node) && node.importClause && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const resolved = ts.resolveModuleName(spec, file, options, host).resolvedModule?.resolvedFileName;
      if (!resolved) return;
      const target = path.resolve(resolved).replace(/\.d\.ts$/, '.ts');
      if (!fileSet.has(target)) return;
      if (!usedByFile.has(target)) usedByFile.set(target, new Set());
      const used = usedByFile.get(target);
      if (node.importClause.name) used.add('default');
      const b = node.importClause.namedBindings;
      if (b) {
        if (ts.isNamespaceImport(b)) used.add('*');
        else b.elements.forEach((e) => used.add((e.propertyName || e.name).text));
      }
    }
  });

  exportMap.set(file, exports);
}

const unusedExports = [];
for (const [file, exports] of exportMap) {
  if (ENTRYPOINTS.includes(file)) continue;
  if (IGNORE_FILES.has(file)) continue;
  if (IGNORE_PREFIXES.some((p) => file.startsWith(p))) continue;
  const used = usedByFile.get(file) || new Set();
  if (used.has('*')) continue;
  for (const name of exports) if (!used.has(name)) unusedExports.push(`${path.relative(process.cwd(), file)} - export "${name}" is never imported`);
}

if (!unusedImportDiags.length && !unusedExports.length) {
  console.log('No unused imports/exports found.');
  process.exit(0);
}
if (unusedImportDiags.length) {
  console.log('Unused imports / locals diagnostics:');
  unusedImportDiags.forEach((line) => console.log(`- ${line}`));
}
if (unusedExports.length) {
  console.log('\nUnused exports:');
  unusedExports.sort().forEach((line) => console.log(`- ${line}`));
}
process.exit(1);
