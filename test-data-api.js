#!/usr/bin/env node

import fetch from 'node-fetch';

// テスト用の設定
const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJ0aWVyIjoidGllcjEiLCJleHAiOjk5OTk5OTk5OTl9.test';

async function testDataApi() {
  console.log('🔍 Testing Data API endpoints...\n');

  // テストケース1: 人口データの取得
  console.log('Test 1: Fetching population data...');
  try {
    const response = await fetch(`${BASE_URL}/api/data/secure/population/2024.json`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, response.headers.raw());

    if (response.ok) {
      const data = await response.json();
      console.log('Data:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.json();
      console.log('Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // テストケース2: 存在しないファイル
  console.log('Test 2: Fetching non-existent file...');
  try {
    const response = await fetch(`${BASE_URL}/api/data/secure/nonexistent.json`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });

    console.log(`Status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      console.log('Error (expected):', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // テストケース3: 認証なしでのアクセス
  console.log('Test 3: Accessing without authentication...');
  try {
    const response = await fetch(`${BASE_URL}/api/data/secure/population/2024.json`);

    console.log(`Status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      console.log('Error (expected):', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }

  console.log('\n✅ Tests completed');
}

// 実行
testDataApi().catch(console.error);
