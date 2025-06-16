#!/usr/bin/env node

import fetch from 'node-fetch';

// テスト用の設定
const BASE_URL = 'http://localhost:3000';

async function testHealthCheck() {
  console.log('🔍 Testing Health Check endpoints...\n');

  // テストケース1: 基本的なヘルスチェック
  console.log('Test 1: Basic health check...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // テストケース2: 詳細なヘルスチェック
  console.log('Test 2: Detailed health check...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/health/detailed`);
    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // テストケース3: Liveness probe
  console.log('Test 3: Liveness probe...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/health/live`);
    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // テストケース4: Readiness probe
  console.log('Test 4: Readiness probe...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/health/ready`);
    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }

  console.log('\n✅ Tests completed');
}

// 実行
testHealthCheck().catch(console.error);
