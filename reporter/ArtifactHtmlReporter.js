import fs from 'fs';
import path from 'path';

// Helper – strip ANSI escape codes (same as original reporter)
function stripAnsi(value) {
  return String(value).replace(
    // eslint-disable-next-line no-control-regex
    /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
    ''
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDuration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

function getAttachment(result, pattern) {
  return result.attachments.find(a => pattern.test(a.path) || pattern.test(a.name));
}

function getDownloadName(result, attachment) {
  const extension = path.extname(attachment.path) || '.webm';
  const slug = result.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${slug || 'playwright-test'}-video${extension}`;
}

function getDownloadPath(attachmentPath, fileName) {
  return `${attachmentPath}?download=${encodeURIComponent(fileName)}`;
}

/**
 * HTML version of the Playwright test reporter.
 *
 * Options:
 *   - outputFile    (default: 'artifacts/test-report.md')
 *   - outputHtml    (default: 'artifacts/test-report.html')
 */
class ArtifactHtmlReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile || 'artifacts/test-report.md';
    this.outputHtml = options.outputHtml || 'artifacts/test-report.html';
    this.results = [];
    this.startedAt = new Date();
  }

  // ---------------------------------------------------------------------------
  // Same collection logic as the original reporter – keep unchanged
  // ---------------------------------------------------------------------------
  onTestEnd(test, result) {
    const titlePath = typeof test.titlePath === 'function'
      ? test.titlePath().filter(Boolean)
      : [test.title];

    const location = test.location
      ? `${path.relative(process.cwd(), test.location.file)}:${test.location.line}:${test.location.column}`
      : '';

    const attachments = result.attachments
      .filter(a => a.path)
      .map(a => ({
        name: a.name,
        path: path.relative(path.dirname(this.outputFile), a.path),
      }));

    this.results.push({
      title: titlePath.join(' > '),
      status: result.status,
      duration: result.duration,
      location,
      errors: result.errors.map(e =>
        stripAnsi(e.message || e.stack || String(e))
      ),
      attachments,
    });
  }

  // ---------------------------------------------------------------------------
  // When the run finishes – build Markdown, then turn it into HTML
  // ---------------------------------------------------------------------------
  onEnd(fullResult) {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const timedOut = this.results.filter(r => r.status === 'timedOut').length;

    // ---------- Markdown generation (identical to original) ----------
    const lines = [
      '# Playwright Test Report',
      '',
      `Status: ${fullResult.status}`,
      `Started: ${this.startedAt.toISOString()}`,
      `Finished: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `- Total: ${this.results.length}`,
      `- Passed: ${passed}`,
      `- Failed: ${failed}`,
      `- Timed out: ${timedOut}`,
      `- Skipped: ${skipped}`,
      '',
      '## Tests',
      '',
    ];

    for (const r of this.results) {
      lines.push(`### ${r.status.toUpperCase()} - ${r.title}`);
      lines.push('');
      if (r.location) lines.push(`Location: ${r.location}`);
      lines.push(`Duration: ${r.duration}ms`);
      if (r.errors.length) {
        lines.push('', 'Error:', '```', r.errors.join('\n\n'), '```');
      }
      if (r.attachments.length) {
        lines.push('', 'Artifacts:');
        for (const a of r.attachments) {
          lines.push(`- [${a.name}](${a.path})`);
        }
      }
      lines.push('');
    }

    const markdown = `${lines.join('\n').trimEnd()}\n`;
    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, markdown);

    const rows = this.results.map((r) => {
      const video = getAttachment(r, /\.(mp4|webm|ogg)$/i);
      const errorContext = getAttachment(r, /error-context/i);
      const firstError = r.errors[0] || '';
      const statusClass = r.status.toLowerCase();
      const statusText = r.status.toUpperCase();
      const videoDownloadName = video ? getDownloadName(r, video) : '';
      const videoDownloadPath = video ? getDownloadPath(video.path, videoDownloadName) : '';

      return `<tr class="${statusClass}">
  <td><span class="status ${statusClass}">${escapeHtml(statusText)}</span></td>
  <td>
    <div class="test-title">${escapeHtml(r.title)}</div>
    <div class="test-location">${escapeHtml(r.location)}</div>
    ${firstError ? `<details><summary>Error details</summary><pre>${escapeHtml(firstError)}</pre></details>` : ''}
  </td>
  <td>${escapeHtml(formatDuration(r.duration))}</td>
  <td class="actions">
    ${video ? `<a href="${escapeHtml(video.path)}" target="_blank" rel="noreferrer">Open video</a>` : '<span class="muted">No video</span>'}
    ${video ? `<a class="download-link" href="${escapeHtml(videoDownloadPath)}">Download video</a>` : ''}
    ${errorContext ? `<a href="${escapeHtml(errorContext.path)}" target="_blank" rel="noreferrer">Error context</a>` : ''}
  </td>
</tr>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Playwright Test Report</title>
  <style>
    :root {color-scheme: light;--bg:#f7f8fb;--panel:#ffffff;--border:#d8dde7;--text:#1d2433;--muted:#697386;--pass:#1f8f4d;--fail:#cc3340;--skip:#8a6d1d;--link:#155eef;}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,sans-serif;font-size:14px}
    main{max-width:1180px;margin:0 auto;padding:32px 24px}
    h1{margin:0 0 18px;font-size:32px}
    .meta{color:var(--muted);margin-bottom:24px}
    .summary{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));border:1px solid var(--border);background:var(--panel);margin-bottom:28px}
    .summary-card{padding:16px;border-right:1px solid var(--border)}.summary-card:last-child{border-right:0}
    .summary-label{color:var(--muted);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
    .summary-value{margin-top:8px;font-size:28px;font-weight:700}
    table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--border)}
    th,td{padding:14px 16px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
    th{color:var(--muted);font-size:12px;letter-spacing:.08em;text-transform:uppercase;background:#f0f3f8}
    tr:last-child td{border-bottom:0}
    .status{display:inline-block;min-width:72px;padding:6px 8px;border-radius:4px;color:#fff;font-size:12px;font-weight:700;text-align:center}
    .status.passed{background:var(--pass)}.status.failed,.status.timedout{background:var(--fail)}.status.skipped{background:var(--skip)}
    .test-title{font-weight:700}
    .test-location{color:var(--muted);font-size:12px;margin-top:4px}
    details{margin-top:10px}
    summary{cursor:pointer;color:var(--link);font-weight:700}
    pre{margin:10px 0 0;padding:12px;overflow:auto;white-space:pre-wrap;background:#f6f7f9;border:1px solid var(--border);border-radius:4px}
    .actions{min-width:210px}
    .actions a{display:block;width:max-content;margin-bottom:8px;color:var(--link);font-weight:700;text-decoration:none}
    .actions a:hover{text-decoration:underline}
    .actions .download-link{padding:7px 10px;color:#fff;background:var(--link);border-radius:4px}
    .actions .download-link:hover{background:#0f46b5;text-decoration:none}
    .muted{color:var(--muted)}
    @media(max-width:820px){main{padding:20px 12px}.summary{grid-template-columns:repeat(2,minmax(120px,1fr))}.summary-card{border-bottom:1px solid var(--border)}table,thead,tbody,th,td,tr{display:block}thead{display:none}tr{border-bottom:1px solid var(--border)}td{border-bottom:0}}
  </style>
</head>
<body>
<main>
  <h1>Playwright Test Report</h1>
  <div class="meta">Status: ${escapeHtml(fullResult.status)} | Started: ${escapeHtml(this.startedAt.toISOString())} | Finished: ${escapeHtml(new Date().toISOString())}</div>
  <section class="summary" aria-label="Test result summary">
    <div class="summary-card"><div class="summary-label">Total Tests</div><div class="summary-value">${this.results.length}</div></div>
    <div class="summary-card"><div class="summary-label">Passed</div><div class="summary-value">${passed}</div></div>
    <div class="summary-card"><div class="summary-label">Failed</div><div class="summary-value">${failed}</div></div>
    <div class="summary-card"><div class="summary-label">Timed Out</div><div class="summary-value">${timedOut}</div></div>
    <div class="summary-card"><div class="summary-label">Skipped</div><div class="summary-value">${skipped}</div></div>
  </section>
  <table>
    <thead><tr><th>Status</th><th>Test</th><th>Duration</th><th>Links</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</main>
</body>
</html>`;

    fs.mkdirSync(path.dirname(this.outputHtml), { recursive: true });
    fs.writeFileSync(this.outputHtml, html);
  }
}

export default ArtifactHtmlReporter;
