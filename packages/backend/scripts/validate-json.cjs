#!/usr/bin/env node
// scripts/validate-json.js
// JSON validation script for data files

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class JSONValidator {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(__dirname, '../data');
    this.errors = [];
    this.warnings = [];
    this.validFiles = 0;
    this.totalFiles = 0;
  }

  async validate() {
    console.log('🔍 Validating JSON files in:', this.dataDir);
    console.log('─'.repeat(60));

    try {
      const files = glob.sync('**/*.json', {
        cwd: this.dataDir,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      });

      this.totalFiles = files.length;

      if (files.length === 0) {
        console.log('⚠️  No JSON files found in the data directory.');
        return true;
      }

      for (const file of files) {
        await this.validateFile(file);
      }

      this.printResults();
      return this.errors.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  async validateFile(filePath) {
    const relativePath = path.relative(this.dataDir, filePath);
    
    try {
      // File size check
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        this.errors.push({
          file: relativePath,
          message: 'File is empty',
        });
        console.log(`❌ ${relativePath} - Empty file`);
        return;
      }

      if (stats.size > 10 * 1024 * 1024) { // 10MB
        this.warnings.push({
          file: relativePath,
          message: 'File size exceeds 10MB',
          size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
        });
      }

      // Read and parse JSON
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for BOM
      if (content.charCodeAt(0) === 0xFEFF) {
        this.warnings.push({
          file: relativePath,
          message: 'File contains BOM (Byte Order Mark)',
        });
      }

      // Parse JSON
      const data = JSON.parse(content);

      // Validate structure
      this.validateStructure(data, relativePath);

      // Check required metadata
      this.checkMetadata(data, relativePath);

      // UTF-8 validation
      if (!this.isValidUTF8(content)) {
        this.errors.push({
          file: relativePath,
          message: 'Invalid UTF-8 encoding',
        });
      }

      // Check for common issues
      this.checkCommonIssues(data, relativePath);

      console.log(`✅ ${relativePath}`);
      this.validFiles++;
    } catch (error) {
      this.errors.push({
        file: relativePath,
        message: `Parse error: ${error.message}`,
      });
      console.log(`❌ ${relativePath} - ${error.message}`);
    }
  }

  validateStructure(data, filePath) {
    // Check if it's an object (not array at root level)
    if (Array.isArray(data)) {
      this.warnings.push({
        file: filePath,
        message: 'Root element is an array (consider wrapping in an object)',
      });
    }

    // Check for extremely nested structures
    const depth = this.getMaxDepth(data);
    if (depth > 10) {
      this.warnings.push({
        file: filePath,
        message: `Deeply nested structure (depth: ${depth})`,
      });
    }
  }

  checkMetadata(data, filePath) {
    // Skip metadata check for index.json and metadata.json files
    if (filePath.endsWith('index.json') || filePath.endsWith('metadata.json')) {
      return;
    }

    if (!data.metadata) {
      this.warnings.push({
        file: filePath,
        message: 'Missing metadata field',
      });
      return;
    }

    const requiredFields = ['source', 'lastUpdated', 'license'];
    const missingFields = requiredFields.filter(field => !data.metadata[field]);

    if (missingFields.length > 0) {
      this.warnings.push({
        file: filePath,
        message: `Missing metadata fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate date format
    if (data.metadata.lastUpdated) {
      const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2}))?$/;
      if (!datePattern.test(data.metadata.lastUpdated)) {
        this.warnings.push({
          file: filePath,
          message: 'Invalid date format in metadata.lastUpdated (use YYYY-MM-DD or ISO 8601)',
        });
      }
    }
  }

  checkCommonIssues(data, filePath) {
    // Check for null values
    const nullCount = this.countNulls(data);
    if (nullCount > 0) {
      this.warnings.push({
        file: filePath,
        message: `Contains ${nullCount} null value(s)`,
      });
    }

    // Check for empty strings
    const emptyStringCount = this.countEmptyStrings(data);
    if (emptyStringCount > 0) {
      this.warnings.push({
        file: filePath,
        message: `Contains ${emptyStringCount} empty string(s)`,
      });
    }

    // Check for duplicate keys (JSON.parse already handles this, but good to note)
    // Modern JSON parsers handle duplicates by keeping the last value
  }

  getMaxDepth(obj, currentDepth = 0) {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      const depth = this.getMaxDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  countNulls(obj) {
    if (obj === null) return 1;
    if (typeof obj !== 'object') return 0;

    let count = 0;
    for (const value of Object.values(obj)) {
      count += this.countNulls(value);
    }
    return count;
  }

  countEmptyStrings(obj) {
    if (obj === '') return 1;
    if (typeof obj !== 'object' || obj === null) return 0;

    let count = 0;
    for (const value of Object.values(obj)) {
      count += this.countEmptyStrings(value);
    }
    return count;
  }

  isValidUTF8(str) {
    try {
      // Encode and decode to check for invalid sequences
      return str === Buffer.from(str, 'utf8').toString('utf8');
    } catch {
      return false;
    }
  }

  printResults() {
    console.log('\n' + '─'.repeat(60));
    console.log('📊 Validation Results\n');

    if (this.errors.length > 0) {
      console.log('❌ Errors (' + this.errors.length + '):');
      this.errors.forEach(({ file, message }) => {
        console.log(`   ${file}:`);
        console.log(`   └─ ${message}`);
      });
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings (' + this.warnings.length + '):');
      this.warnings.forEach(({ file, message, ...extra }) => {
        console.log(`   ${file}:`);
        console.log(`   └─ ${message}`);
        if (Object.keys(extra).length > 0) {
          console.log(`      ${JSON.stringify(extra)}`);
        }
      });
      console.log();
    }

    console.log('📈 Summary:');
    console.log(`   Total files: ${this.totalFiles}`);
    console.log(`   Valid files: ${this.validFiles}`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);

    if (this.errors.length === 0) {
      console.log('\n✨ All files passed validation!');
    } else {
      console.log('\n❌ Validation failed. Please fix the errors above.');
    }
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dataDir = args[0] || path.join(__dirname, '../data');
  
  const validator = new JSONValidator(dataDir);
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = JSONValidator;