import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JSONValidator {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.errors = [];
    this.warnings = [];
  }

  async validate() {
    console.log('🔍 Validating JSON files...\n');

    const files = glob.sync('**/*.json', {
      cwd: this.dataDir,
      absolute: true,
    });

    for (const file of files) {
      await this.validateFile(file);
    }

    this.printResults();
    return this.errors.length === 0;
  }

  async validateFile(filePath) {
    const relativePath = path.relative(this.dataDir, filePath);

    try {
      // ファイルサイズチェック
      const stats = fs.statSync(filePath);
      if (stats.size > 10 * 1024 * 1024) {
        // 10MB
        this.warnings.push({
          file: relativePath,
          message: 'File size exceeds 10MB',
          size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
        });
      }

      // JSON構文チェック
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // 必須フィールドチェック
      this.checkRequiredFields(data, relativePath);

      // エンコーディングチェック
      if (!this.isValidUTF8(content)) {
        this.errors.push({
          file: relativePath,
          message: 'Invalid UTF-8 encoding',
        });
      }

      console.log(`✅ ${relativePath}`);
    } catch (error) {
      this.errors.push({
        file: relativePath,
        message: error.message,
      });
      console.log(`❌ ${relativePath}`);
    }
  }

  checkRequiredFields(data, filePath) {
    // メタデータチェック
    if (!data.metadata) {
      this.warnings.push({
        file: filePath,
        message: 'Missing metadata field',
      });
    } else {
      const requiredMetadata = ['source', 'lastUpdated', 'license'];
      for (const field of requiredMetadata) {
        if (!data.metadata[field]) {
          this.warnings.push({
            file: filePath,
            message: `Missing metadata.${field}`,
          });
        }
      }
    }
  }

  isValidUTF8(str) {
    try {
      return str === Buffer.from(str, 'utf8').toString('utf8');
    } catch {
      return false;
    }
  }

  printResults() {
    console.log('\n📊 Validation Results:');
    console.log('─'.repeat(50));

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(({ file, message }) => {
        console.log(`  ${file}: ${message}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(({ file, message, ...extra }) => {
        console.log(`  ${file}: ${message}`, extra);
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✨ All files are valid!');
    }

    console.log('\n📈 Summary:');
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
  }
}

// 実行
const validator = new JSONValidator(path.join(__dirname, '../data'));
validator.validate().then((success) => {
  process.exit(success ? 0 : 1);
});

export default JSONValidator;
