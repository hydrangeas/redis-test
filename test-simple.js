import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function test() {
  const dataDirectory = process.env.DATA_DIRECTORY || join(process.cwd(), 'data');
  const dataPath = 'secure/population/2024.json';
  const filePath = join(dataDirectory, dataPath);
  
  console.log('Current directory:', process.cwd());
  console.log('Data directory:', dataDirectory);
  console.log('Data path:', dataPath);
  console.log('Full file path:', filePath);
  
  try {
    const stats = await fs.stat(filePath);
    console.log('File exists:', stats.isFile());
    console.log('File size:', stats.size);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();