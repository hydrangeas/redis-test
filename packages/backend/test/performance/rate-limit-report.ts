import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface TestResult {
  name: string;
  passed: boolean;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    rateLimitedRequests: number;
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    duration: number;
  };
}

export class PerformanceReporter {
  static generateReport(testResults: TestResult[]) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: require('os').cpus().length,
        totalMemory: (require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      },
      summary: {
        totalTests: testResults.length,
        passedTests: testResults.filter(r => r.passed).length,
        failedTests: testResults.filter(r => !r.passed).length,
      },
      results: testResults.map(result => ({
        testName: result.name,
        passed: result.passed,
        metrics: {
          totalRequests: result.metrics.totalRequests,
          successRate: (result.metrics.successfulRequests / result.metrics.totalRequests * 100).toFixed(2) + '%',
          rateLimitedRate: (result.metrics.rateLimitedRequests / result.metrics.totalRequests * 100).toFixed(2) + '%',
          averageResponseTime: result.metrics.averageResponseTime.toFixed(2) + 'ms',
          p50ResponseTime: result.metrics.p50ResponseTime.toFixed(2) + 'ms',
          p95ResponseTime: result.metrics.p95ResponseTime.toFixed(2) + 'ms',
          p99ResponseTime: result.metrics.p99ResponseTime.toFixed(2) + 'ms',
          maxResponseTime: result.metrics.maxResponseTime.toFixed(2) + 'ms',
          minResponseTime: result.metrics.minResponseTime.toFixed(2) + 'ms',
          requestsPerSecond: (result.metrics.totalRequests / (result.metrics.duration / 1000)).toFixed(2),
          totalDuration: (result.metrics.duration / 1000).toFixed(2) + 's',
          memoryIncrease: {
            heapUsed: (result.metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
            rss: (result.metrics.memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
          },
        },
        thresholds: {
          p99ResponseTime: {
            target: '< 100ms',
            actual: result.metrics.p99ResponseTime.toFixed(2) + 'ms',
            passed: result.metrics.p99ResponseTime < 100,
          },
          averageResponseTime: {
            target: '< 50ms',
            actual: result.metrics.averageResponseTime.toFixed(2) + 'ms',
            passed: result.metrics.averageResponseTime < 50,
          },
        },
      })),
    };

    // Ensure directory exists
    const reportDir = join(process.cwd(), 'test-results');
    mkdirSync(reportDir, { recursive: true });

    // HTML レポート生成
    const html = this.generateHTMLReport(report);
    writeFileSync(
      join(reportDir, 'rate-limit-performance.html'),
      html
    );

    // JSON レポート生成
    writeFileSync(
      join(reportDir, 'rate-limit-performance.json'),
      JSON.stringify(report, null, 2)
    );

    // Markdown レポート生成
    const markdown = this.generateMarkdownReport(report);
    writeFileSync(
      join(reportDir, 'rate-limit-performance.md'),
      markdown
    );

    console.log(`\nPerformance reports generated in: ${reportDir}`);
    console.log('- rate-limit-performance.html');
    console.log('- rate-limit-performance.json');
    console.log('- rate-limit-performance.md');

    return report;
  }

  private static generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Rate Limit Performance Test Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #333; 
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    .summary { 
      background: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0;
      border-left: 4px solid #4CAF50;
    }
    .passed { color: #28a745; font-weight: bold; }
    .failed { color: #dc3545; font-weight: bold; }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin-top: 20px; 
      font-size: 14px;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 12px 8px; 
      text-align: left; 
    }
    th { 
      background-color: #4CAF50; 
      color: white; 
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f5f5f5; }
    .metric { font-family: 'Courier New', monospace; }
    .environment {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 14px;
    }
    .threshold-passed { color: #28a745; }
    .threshold-failed { color: #dc3545; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Rate Limit Performance Test Report</h1>
    
    <div class="summary">
      <h2>📊 Summary</h2>
      <p><strong>Test Date:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
      <p><strong>Total Tests:</strong> ${report.summary.totalTests}</p>
      <p class="passed">✅ Passed: ${report.summary.passedTests}</p>
      <p class="failed">❌ Failed: ${report.summary.failedTests}</p>
    </div>
    
    <div class="environment">
      <h3>💻 Test Environment</h3>
      <p><strong>Node Version:</strong> ${report.environment.nodeVersion}</p>
      <p><strong>Platform:</strong> ${report.environment.platform} (${report.environment.arch})</p>
      <p><strong>CPUs:</strong> ${report.environment.cpus}</p>
      <p><strong>Total Memory:</strong> ${report.environment.totalMemory}</p>
    </div>
    
    <h2>📈 Test Results</h2>
    <table>
      <tr>
        <th>Test Name</th>
        <th>Status</th>
        <th>Total Requests</th>
        <th>Success Rate</th>
        <th>Avg Response</th>
        <th>P99 Response</th>
        <th>Req/Second</th>
        <th>Duration</th>
        <th>Memory ↑</th>
      </tr>
      ${report.results.map((r: any) => `
      <tr>
        <td><strong>${r.testName}</strong></td>
        <td class="${r.passed ? 'passed' : 'failed'}">${r.passed ? '✅ PASS' : '❌ FAIL'}</td>
        <td class="metric">${r.metrics.totalRequests.toLocaleString()}</td>
        <td class="metric">${r.metrics.successRate}</td>
        <td class="metric ${r.thresholds.averageResponseTime.passed ? 'threshold-passed' : 'threshold-failed'}">
          ${r.metrics.averageResponseTime}
        </td>
        <td class="metric ${r.thresholds.p99ResponseTime.passed ? 'threshold-passed' : 'threshold-failed'}">
          ${r.metrics.p99ResponseTime}
        </td>
        <td class="metric">${r.metrics.requestsPerSecond}</td>
        <td class="metric">${r.metrics.totalDuration}</td>
        <td class="metric">${r.metrics.memoryIncrease.heapUsed}</td>
      </tr>
      `).join('')}
    </table>
    
    <h2>🎯 Performance Thresholds</h2>
    <ul>
      <li><strong>P99 Response Time:</strong> Target &lt; 100ms</li>
      <li><strong>Average Response Time:</strong> Target &lt; 50ms</li>
    </ul>
  </div>
</body>
</html>
    `;
  }

  private static generateMarkdownReport(report: any): string {
    return `# Rate Limit Performance Test Report

## Summary
- **Test Date:** ${new Date(report.timestamp).toLocaleString()}
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passedTests}
- **Failed:** ${report.summary.failedTests}

## Test Environment
- **Node Version:** ${report.environment.nodeVersion}
- **Platform:** ${report.environment.platform} (${report.environment.arch})
- **CPUs:** ${report.environment.cpus}
- **Total Memory:** ${report.environment.totalMemory}

## Test Results

| Test Name | Status | Total Requests | Success Rate | Avg Response | P99 Response | Req/Second | Duration |
|-----------|--------|----------------|--------------|--------------|--------------|------------|----------|
${report.results.map((r: any) => 
`| ${r.testName} | ${r.passed ? '✅ PASS' : '❌ FAIL'} | ${r.metrics.totalRequests.toLocaleString()} | ${r.metrics.successRate} | ${r.metrics.averageResponseTime} | ${r.metrics.p99ResponseTime} | ${r.metrics.requestsPerSecond} | ${r.metrics.totalDuration} |`
).join('\n')}

## Performance Thresholds
- **P99 Response Time:** Target < 100ms
- **Average Response Time:** Target < 50ms

## Detailed Metrics

${report.results.map((r: any) => `
### ${r.testName}
- **Status:** ${r.passed ? 'PASSED' : 'FAILED'}
- **Total Requests:** ${r.metrics.totalRequests.toLocaleString()}
- **Successful Requests:** ${r.metrics.successRate}
- **Rate Limited:** ${r.metrics.rateLimitedRate}
- **Response Times:**
  - Min: ${r.metrics.minResponseTime}
  - P50: ${r.metrics.p50ResponseTime}
  - P95: ${r.metrics.p95ResponseTime}
  - P99: ${r.metrics.p99ResponseTime}
  - Max: ${r.metrics.maxResponseTime}
- **Memory Usage:**
  - Heap Increase: ${r.metrics.memoryIncrease.heapUsed}
  - RSS Increase: ${r.metrics.memoryIncrease.rss}
`).join('\n')}
`;
  }
}