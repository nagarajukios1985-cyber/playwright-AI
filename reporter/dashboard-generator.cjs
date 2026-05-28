const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, '../artifacts/results.json');
const outputDir = path.join(__dirname, '../artifacts/dashboard');
const outputFile = path.join(outputDir, 'index.html');

if (!fs.existsSync(resultsPath)) {
  console.error('❌ results.json not found');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

const stats = results.stats || {};
const passed = stats.expected || 0;
const failed = stats.unexpected || 0;
const skipped = stats.skipped || 0;

const html = `
<html>
<head>
  <title>Playwright Dashboard</title>
  <style>
    body { font-family: Arial; background:#111; color:#fff; padding:20px; }
    .card { padding:20px; margin:10px; background:#222; border-radius:10px; display:inline-block; }
    .pass { color: lightgreen; }
    .fail { color: red; }
    .skip { color: orange; }
  </style>
</head>
<body>

<h1>🧪 Playwright CI Dashboard</h1>

<div class="card pass">✔ Passed: ${passed}</div>
<div class="card fail">❌ Failed: ${failed}</div>
<div class="card skip">⚠ Skipped: ${skipped}</div>

<h2>Raw Summary</h2>
<pre>${JSON.stringify(stats, null, 2)}</pre>

</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, html);

console.log('✅ Dashboard generated at artifacts/dashboard/index.html');