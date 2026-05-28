const fs = require('fs');
const path = require('path');

function generateDashboard() {
  const resultPath = path.join(process.cwd(), 'artifacts/results.json');

  if (!fs.existsSync(resultPath)) {
    console.log("❌ results.json not found");
    return;
  }

  const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));

  const stats = data.stats || {};
  const tests = data.suites || [];

  const html = `
  <html>
  <head>
    <title>Playwright Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body { font-family: Arial; padding: 20px; background:#f4f4f4; }
      .card { background:white; padding:15px; margin:10px; border-radius:10px; }
      .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
      canvas { max-width:400px; }
    </style>
  </head>

  <body>

    <h1>🚀 Playwright CI Dashboard</h1>

    <div class="grid">
      <div class="card">Total: ${stats.total || 0}</div>
      <div class="card">Passed: ${stats.passed || 0}</div>
      <div class="card">Failed: ${stats.failed || 0}</div>
    </div>

    <div class="card">
      <canvas id="chart"></canvas>
    </div>

    <script>
      const ctx = document.getElementById('chart');

      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Passed', 'Failed'],
          datasets: [{
            data: [${stats.passed || 0}, ${stats.failed || 0}],
          }]
        }
      });
    </script>

  </body>
  </html>
  `;

  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/dashboard.html', html);

  console.log("✅ Dashboard generated");
}

generateDashboard();