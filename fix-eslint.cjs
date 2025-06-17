#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ESLintのインポート順序を自動修正するスクリプト
console.log('Starting ESLint auto-fix for backend...');

try {
  execSync('cd packages/backend && npx eslint . --ext .ts --fix --rule "import/order: error" --no-eslintrc', { 
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '0' }
  });
  console.log('ESLint auto-fix completed successfully');
} catch (error) {
  console.log('ESLint auto-fix completed with some errors (this is expected)');
}

// 最も問題の多いファイルを個別に修正
const problematicFiles = [
  'packages/backend/src/application/event-handlers/api/api-access-requested.handler.ts',
  'packages/backend/src/application/event-handlers/api/rate-limit-exceeded.handler.ts',
  'packages/backend/src/application/event-handlers/auth/authentication-failed.handler.ts',
  'packages/backend/src/application/event-handlers/auth/token-refreshed.handler.ts',
  'packages/backend/src/application/event-handlers/auth/user-authenticated.handler.ts',
  'packages/backend/src/application/event-handlers/auth/user-logged-out.handler.ts',
  'packages/backend/src/application/event-handlers/data/data-resource-not-found.handler.ts',
  'packages/backend/src/application/event-handlers/data/data-retrieved.handler.ts',
  'packages/backend/src/application/event-handlers/index.ts',
];

console.log('\nFixing import order in problematic files...');
problematicFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // インポート文を抽出
    const importRegex = /^import\s+(?:type\s+)?(?:\{[^}]*\}|[^;]+)\s+from\s+['"][^'"]+['"];?$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length === 0) return;
    
    // インポートをカテゴリ分け
    const nodeModules = [];
    const tsyringe = [];
    const domain = [];
    const infrastructure = [];
    const application = [];
    const relative = [];
    const types = [];
    
    imports.forEach(imp => {
      if (imp.includes('import type')) {
        types.push(imp);
      } else if (imp.includes('tsyringe')) {
        tsyringe.push(imp);
      } else if (imp.includes('@/domain')) {
        domain.push(imp);
      } else if (imp.includes('@/infrastructure')) {
        infrastructure.push(imp);
      } else if (imp.includes('@/application')) {
        application.push(imp);
      } else if (imp.includes('./') || imp.includes('../')) {
        relative.push(imp);
      } else {
        nodeModules.push(imp);
      }
    });
    
    // ソート
    nodeModules.sort();
    domain.sort();
    infrastructure.sort();
    application.sort();
    relative.sort();
    types.sort();
    
    // 新しいインポートセクションを作成
    const newImports = [];
    if (nodeModules.length > 0) newImports.push(...nodeModules, '');
    if (tsyringe.length > 0) newImports.push(...tsyringe, '');
    if (domain.length > 0) newImports.push(...domain, '');
    if (infrastructure.length > 0) newImports.push(...infrastructure, '');
    if (application.length > 0) newImports.push(...application, '');
    if (relative.length > 0) newImports.push(...relative, '');
    if (types.length > 0) newImports.push(...types, '');
    
    // 最後の空行を削除
    while (newImports[newImports.length - 1] === '') {
      newImports.pop();
    }
    
    // コンテンツを置換
    let newContent = content;
    const firstImportIndex = content.indexOf(imports[0]);
    const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
    
    newContent = content.substring(0, firstImportIndex) + 
                 newImports.join('\n') + 
                 content.substring(lastImportIndex);
    
    fs.writeFileSync(file, newContent);
    console.log(`Fixed: ${file}`);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error.message);
  }
});

console.log('\nDone!');