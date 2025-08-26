#!/usr/bin/env node

/**
 * Package validation script
 * This script validates that the package exports work correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating bkash-js package...\n');

// Go up one directory to the project root
const projectRoot = path.dirname(__dirname);
console.log('Project root:', projectRoot);

// Check if dist folder exists
const distPath = path.join(projectRoot, 'dist');
console.log('Checking dist path:', distPath);
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: dist folder not found. Run `npm run build` first.');
  process.exit(1);
}

// Check if main files exist
const mainFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/bkash.js',
  'dist/bkash.d.ts'
];

for (const file of mainFiles) {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${file} not found`);
    process.exit(1);
  }
  console.log(`✅ ${file} exists`);
}

// Try to import the package
try {
  const bkashJs = require(path.join(projectRoot, 'dist/index.js'));
  
  // Check if main export exists
  if (!bkashJs.BkashPayment) {
    console.error('❌ Error: BkashPayment export not found');
    process.exit(1);
  }
  console.log('✅ BkashPayment export found');
  
  // Check if it's a constructor
  if (typeof bkashJs.BkashPayment !== 'function') {
    console.error('❌ Error: BkashPayment is not a constructor');
    process.exit(1);
  }
  console.log('✅ BkashPayment is a constructor');
  
  // Check other exports
  const expectedExports = [
    'BkashConfigSchema',
    'PaymentDataSchema',
    'BkashError'
  ];
  
  for (const exportName of expectedExports) {
    if (!bkashJs[exportName]) {
      console.warn(`⚠️  Warning: ${exportName} export not found`);
    } else {
      console.log(`✅ ${exportName} export found`);
    }
  }
  
} catch (error) {
  console.error('❌ Error importing package:', error.message);
  process.exit(1);
}

// Check package.json
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  
  console.log(`\n📦 Package: ${packageJson.name}@${packageJson.version}`);
  console.log(`📝 Description: ${packageJson.description}`);
  console.log(`🏗️  Main: ${packageJson.main}`);
  console.log(`📋 Types: ${packageJson.types}`);
  console.log(`📄 Files: ${packageJson.files.join(', ')}`);
  
  // Validate required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'types', 'author', 'license'];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      console.error(`❌ Error: package.json missing required field: ${field}`);
      process.exit(1);
    }
  }
  
  console.log('\n✅ Package validation completed successfully!');
  console.log('\n🚀 Ready for npm publish!');
  
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  process.exit(1);
}
