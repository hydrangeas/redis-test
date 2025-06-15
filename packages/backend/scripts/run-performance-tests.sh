#!/bin/bash

# Performance test runner script
# This script runs rate limit performance tests and generates reports

echo "🚀 Starting Rate Limit Performance Tests..."
echo "========================================="

# Create test results directory
mkdir -p test-results

# Run performance tests with node flags for garbage collection
echo "Running performance tests..."
node --expose-gc ./node_modules/.bin/vitest run test/performance/rate-limit-load.test.ts

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All performance tests passed!"
    echo ""
    echo "📊 Test reports generated in: test-results/"
    echo "- rate-limit-performance.html"
    echo "- rate-limit-performance.json"
    echo "- rate-limit-performance.md"
else
    echo "❌ Performance tests failed!"
    exit 1
fi