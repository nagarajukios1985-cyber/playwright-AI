const fs = require('fs');
const path = require('path');

class ArtifactHtmlReporter {
  constructor(options = {}) {
    this.outputHtml = options.outputHtml || 'artifacts/test-report.html';
    this.outputFile = options.outputFile || 'artifacts/test-report.md';

    this.results = {
      startTime: new Date(),
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  onTestEnd(test, result) {
    const status = result.status;

    if (status === 'passed') this.results.passed++;
    else if (status === 'failed') this.results.failed++;
    else this.results.skipped++;

    this.results.tests.push({
      title: test.title,
      file: test.location.file,
      duration: result.duration,
      status,
    });
  }

  async onEnd() {
    this.results.endTime = new Date();

    this.generateMarkdown();
    this.generateHTML();
  }

  generateMarkdown() {
    const md = `
# Playwright Test Report

- Total: ${this.results.tests.length}
- Passed: ${this.results.passed}
- Failed: ${this.results.failed}
- Skipped: ${this.results.skipped}

## Tests

${this.results.tests.map(t =>
  `- ${t.status.toUpperCase()} | ${t.title} | ${t.duration}ms`
).join('\n')}
`;

    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, md);
  }

  generateHTML() {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Playwright Dashboard</title>
  <style>
    body { font-family: Arial; background:#0f172a; color:#fff; padding:20px; }
    .card { display:inline-block; padding:15px; margin:10px; background:#1e293b; border-radius:12px; }
    .passed { color:#22c55e; }
    .failed { color:#ef4444; }
    table { width:100%; margin-top:20px; border-collapse: collapse; }
    th, td { padding:10px; border-bottom:1px solid #334155; }
  </style>
</head>
<body>

<h1>🧪 Playwright Dashboard</h1>

<div class="card">Total: ${this.results.tests.length}</div>
<div class="card passed">Passed: ${this.results.passed}</div>
<div class="card failed">Failed: ${this.results.failed}</div>
<div class="card">Skipped: ${this.results.skipped}</div>

<table>
  <tr>
    <th>Status</th>
    <th>Test</th>
    <th>File</th>
    <th>Duration</th>
  </tr>

  ${this.results.tests.map(t => `
    <tr>
      <td class="${t.status}">${t.status.toUpperCase()}</td>
      <td>${t.title}</td>
      <td>${t.file}</td>
      <td>${t.duration}ms</td>
    </tr>
  `).join('')}
</table>

</body>
</html>
`;

    fs.mkdirSync(path.dirname(this.outputHtml), { recursive: true });
    fs.writeFileSync(this.outputHtml, html);
  }
}

module.exports = ArtifactHtmlReporter;

