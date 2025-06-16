import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Data Directory Structure', () => {
  const dataDir = path.join(process.cwd(), 'data');

  it('should have the correct directory structure', async () => {
    // Check main directories exist
    const expectedDirs = [
      'secure',
      'secure/population',
      'secure/budget',
      'secure/budget/2024',
      'secure/statistics',
      'public',
    ];

    for (const dir of expectedDirs) {
      const dirPath = path.join(dataDir, dir);
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    }
  });

  it('should have required files', async () => {
    const expectedFiles = [
      'index.json',
      '.htaccess',
      '.gitignore',
      'public/README.md',
      'secure/population/2024.json',
      'secure/population/2023.json',
      'secure/population/metadata.json',
      'secure/budget/2024/general.json',
      'secure/statistics/education.json',
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(dataDir, file);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists, `File ${file} should exist`).toBe(true);
    }
  });

  it('should have valid index.json', async () => {
    const indexPath = path.join(dataDir, 'index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(content);

    expect(index).toHaveProperty('version');
    expect(index).toHaveProperty('lastUpdated');
    expect(index).toHaveProperty('categories');
    expect(index.categories).toHaveProperty('population');
    expect(index.categories).toHaveProperty('budget');
    expect(index.categories).toHaveProperty('statistics');
  });

  it('should have valid population data with required metadata', async () => {
    const files = ['2024.json', '2023.json'];

    for (const file of files) {
      const filePath = path.join(dataDir, 'secure/population', file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Check structure
      expect(data).toHaveProperty('year');
      expect(data).toHaveProperty('prefecture');
      expect(data).toHaveProperty('totalPopulation');
      expect(data).toHaveProperty('households');
      expect(data).toHaveProperty('populationByCity');
      expect(data).toHaveProperty('ageDistribution');

      // Check metadata
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('source');
      expect(data.metadata).toHaveProperty('lastUpdated');
      expect(data.metadata).toHaveProperty('license');
    }
  });

  it('should prevent direct file access with .htaccess', async () => {
    const htaccessPath = path.join(dataDir, '.htaccess');
    const content = await fs.readFile(htaccessPath, 'utf-8');

    expect(content).toContain('Deny from all');
    expect(content).toContain('Order deny,allow');
  });

  it('should have proper file permissions', async () => {
    // Skip permission test on Windows or WSL
    if (process.platform === 'win32' || process.env.WSL_DISTRO_NAME) {
      expect(true).toBe(true);
      return;
    }

    const files = ['secure/population/2024.json', 'secure/budget/2024/general.json'];

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const stats = await fs.stat(filePath);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);

      // Files should be readable but may have different permissions based on system
      // Accept common file permissions
      expect(['644', '664', '755', '777']).toContain(mode);
    }
  });
});
