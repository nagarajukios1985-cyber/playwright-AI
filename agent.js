import OpenAI from "openai";
import dotenv from "dotenv";
import readline from "readline";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

dotenv.config();

const VERBOSE = process.env.AGENT_VERBOSE === "true";

function logDebug(...args) {
  if (VERBOSE) console.log(...args);
}
function logUser(...args) {
  console.log(...args);
}

function isPlaywrightTestCommand(command) {
  return /\b(?:npx\s+)?playwright\s+test\b/.test(command);
}
function getHtmlReportMessage() {
  const htmlReportPath = path.resolve("artifacts/test-report.html");
  return fs.existsSync(htmlReportPath)
    ? `See HTML report: ${htmlReportPath}`
    : "HTML report was not generated.";
}
function cleanPlaywrightArtifacts() {
  const artifactsPath = path.resolve("artifacts");
  fs.rmSync(artifactsPath, { recursive: true, force: true });
}
function logCommandFailure(command, errorMessage) {
  if (isPlaywrightTestCommand(command)) {
    logUser(`\n❌ Tests failed. ${getHtmlReportMessage()}`);
    return;
  }
  logUser(`\n❌ Command failed:\n${errorMessage}`);
}
function startThinking(message = "Thinking") {
  const frames = ["...", "   "];
  let frameIndex = 0;
  process.stdout.write(`\n${message}${frames[frameIndex]}`);
  const timer = setInterval(() => {
    frameIndex = (frameIndex + 1) % frames.length;
    process.stdout.write(`\r${message}${frames[frameIndex]}`);
  }, 450);
  return () => {
    clearInterval(timer);
    process.stdout.write(`\r${message}...\n`);
  };
}

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SYSTEM_PROMPT = fs.readFileSync("./prompts/systemPrompt.md", "utf-8");

function runCommand(command) {
  return new Promise((resolve) => {
    logDebug(`\n⚡ Running:\n${command}\n`);
    if (isPlaywrightTestCommand(command)) cleanPlaywrightArtifacts();
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout = "", stderr = "") => {
      if (stdout) { logDebug(`\n✅ STDOUT:\n`); logDebug(stdout); }
      if (stderr) { logDebug(`\n⚠️ STDERR:\n`); logDebug(stderr); }
      if (error) {
        logCommandFailure(command, error.message);
        resolve({ success: false, stdout, stderr, error: error.message });
        return;
      }
      resolve({ success: true, stdout, stderr, error: "" });
    });
  });
}

function createFile(filePath, content = "") {
  try {
    const dir = path.dirname(filePath);
    if (dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logDebug(`\n📁 Folder created: ${dir}`);
    }
    fs.writeFileSync(filePath, content);
    logDebug(`\n📄 File created: ${filePath}`);
    return { success: true, path: filePath };
  } catch (err) {
    logUser(`\n❌ Create failed:\n${err.message}`);
    return { success: false, path: filePath, error: err.message };
  }
}
function createFolder(folderPath) {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      logDebug(`\n📁 Folder created: ${folderPath}`);
    }
    return { success: true, path: folderPath };
  } catch (err) {
    logUser(`\n❌ Folder failed:\n${err.message}`);
    return { success: false, path: folderPath, error: err.message };
  }
}
function collectFiles(folder = ".") {
  function walk(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (file === "node_modules" || file === ".git") continue;
      if (stat.isDirectory()) results = results.concat(walk(fullPath));
      else results.push(fullPath);
    }
    return results;
  }
  return walk(folder);
}
function removeScriptExtension(filePath) {
  return filePath.replace(/\.(spec|test)?\.(js|jsx|ts|tsx)$/, (m) => m.replace(/\.(js|jsx|ts|tsx)$/, ""));
}
function resolveExistingPath(filePath) {
  if (!filePath || fs.existsSync(filePath)) return filePath;
  const extCandidates = [
    filePath.replace(/\.js$/, ".ts"),
    filePath.replace(/\.jsx$/, ".tsx"),
    filePath.replace(/\.ts$/, ".js"),
    filePath.replace(/\.tsx$/, ".jsx"),
  ];
  const direct = extCandidates.find((c) => c !== filePath && fs.existsSync(c));
  if (direct) return direct;
  const requestedDir = path.dirname(filePath);
  const requestedBase = removeScriptExtension(path.basename(filePath));
  try {
    const files = collectFiles(".");
    const matched = files.find((c) => {
      const sameFolder = path.dirname(c) === requestedDir;
      const sameBase = removeScriptExtension(path.basename(c)) === requestedBase;
      return sameFolder && sameBase;
    });
    return matched || filePath;
  } catch { return filePath; }
}

const INSPECTION_ACTIONS = new Set(["list_files", "read_file"]);
const MUTATION_ACTIONS = new Set(["create_file","update_file","replace_file","remove_test","create_folder","run_command"]);

function findMatchingParen(content, openIndex) {
  let depth = 0, quote = "", escaped = false;
  for (let i = openIndex; i < content.length; i++) {
    const ch = content[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
function findTestBlocks(content) {
  const blocks = [];
  const testPattern = /\btest\s*\(/g;
  let match;
  while ((match = testPattern.exec(content)) !== null) {
    const start = match.index;
    const openIdx = content.indexOf('(', start);
    const closeIdx = findMatchingParen(content, openIdx);
    if (closeIdx === -1) continue;
    const callText = content.slice(start, closeIdx + 1);
    const titleMatch = callText.match(/test\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/s);
    let blockStart = content.lastIndexOf('\n', start - 1) + 1;
    let blockEnd = closeIdx + 1;
    while (content[blockEnd] === ' ' || content[blockEnd] === '\t') blockEnd++;
    if (content[blockEnd] === ';') blockEnd++;
    if (content[blockEnd] === '\r' && content[blockEnd+1] === '\n') blockEnd += 2;
    else if (content[blockEnd] === '\n') blockEnd++;
    blocks.push({ start: blockStart, end: blockEnd, title: titleMatch?.[2] || "" });
  }
  return blocks;
}
function cleanupEmptyDescribeBlocks(content) {
  return (
    content
      .replace(/\n?\s*test\.describe\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*{\s*}\s*\);?\s*/gs, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}
function removeTest(filePath, title = "") {
  try {
    const resolved = resolveExistingPath(filePath);
    if (!resolved || !fs.existsSync(resolved)) {
      logUser(`\n❌ File not found: ${filePath}`);
      return { success: false, path: filePath, error: "File not found" };
    }
    const content = fs.readFileSync(resolved, "utf-8");
    const blocks = findTestBlocks(content);
    if (!blocks.length) {
      logUser(`\nℹ️ No test(...) cases remain in: ${resolved}`);
      return { success: false, path: resolved, error: "No test cases remain" };
    }
    const selected = title ? blocks.find(b => b.title.toLowerCase().includes(title.toLowerCase())) : blocks[blocks.length - 1];
    if (!selected) {
      logUser(`\n❌ Test case not found: ${title}`);
      return { success: false, path: resolved, error: "Test case not found" };
    }
    const updated = cleanupEmptyDescribeBlocks(content.slice(0, selected.start) + content.slice(selected.end));
    fs.writeFileSync(resolved, updated);
    logDebug(`\n🧹 Removed test: ${selected.title || "last test case"}`);
    logDebug(`\n♻️ File replaced: ${resolved}`);
    return { success: true, path: resolved, removedTitle: selected.title };
  } catch (err) {
    logUser(`\n❌ Remove test failed:\n${err.message}`);
    return { success: false, path: filePath, error: err.message };
  }
}

function readFile(filePath) {
  try {
    const resolved = resolveExistingPath(filePath);
    if (!resolved || !fs.existsSync(resolved)) { logUser(`\n❌ File not found: ${filePath}`); return ""; }
    if (resolved !== filePath) logDebug(`\nℹ️ Using existing file: ${resolved}`);
    return fs.readFileSync(resolved, "utf-8");
  } catch (err) { logUser(`\n❌ Read failed:\n${err.message}`); return ""; }
}
function updateFile(filePath, newContent) {
  try {
    const resolved = resolveExistingPath(filePath);
    if (!resolved || !fs.existsSync(resolved)) { logUser(`\n❌ File not found: ${filePath}`); return { success: false, path: filePath, error: "File not found" }; }
    const existing = fs.readFileSync(resolved, "utf-8");
    fs.writeFileSync(resolved, existing + "\n" + newContent);
    if (resolved !== filePath) logDebug(`\nℹ️ Using existing file: ${resolved}`);
    logDebug(`\n✏️ File updated: ${resolved}`);
    return { success: true, path: resolved };
  } catch (err) { logUser(`\n❌ Update failed:\n${err.message}`); return { success: false, path: filePath, error: err.message }; }
}
function replaceFile(filePath, newContent) {
  try {
    const resolved = resolveExistingPath(filePath);
    if (!resolved || !fs.existsSync(resolved)) { logUser(`\n❌ File not found: ${filePath}`); return { success: false, path: filePath, error: "File not found" }; }
    fs.writeFileSync(resolved, newContent);
    if (resolved !== filePath) logDebug(`\nℹ️ Using existing file: ${resolved}`);
    logDebug(`\n♻️ File replaced: ${resolved}`);
    return { success: true, path: resolved };
  } catch (err) { logUser(`\n❌ Replace failed:\n${err.message}`); return { success: false, path: filePath, error: err.message }; }
}
function listFiles(folder = ".") {
  try {
    const files = collectFiles(folder);
    logDebug(`\n📂 Project Files:\n`);
    logDebug(files);
    return files;
  } catch (err) { logUser(`\n❌ Failed to list files:\n${err.message}`); return []; }
}

function limitText(value, maxLength = 12000) {
  const text = String(value ?? "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n... truncated ...`;
}
function buildPlanningMessage(input, observations = []) {
  if (!observations.length) return input;
  return [
    `Original user request:\n${input}`,
    "Previous execution observations:",
    JSON.stringify(observations, null, 2),
    "Use these observations to create the next executable JSON plan.",
    "If the goal is complete, return one chat step that says what was completed.",
  ].join("\n\n");
}
async function createPlan(input, observations = []) {
  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-120b:free",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPlanningMessage(input, observations) },
    ],
  });
  const raw = response.choices[0].message.content;
  try { return JSON.parse(raw); } catch { logUser("\n❌ Invalid JSON Response\n"); logDebug(raw); return null; }
}
async function executePlan(plan) {
  if (!plan?.steps) { logUser("\n❌ No steps found"); return { observations: [], needsFollowUp: false }; }
  logDebug(`\n🎯 Goal: ${plan.goal}`);
  const observations = [];
  let hasFreshInspection = false;
  for (const step of plan.steps) {
    if (hasFreshInspection && MUTATION_ACTIONS.has(step.action)) { logDebug("\n🔁 Inspection completed. Re‑planning before changing files."); return { observations, needsFollowUp: true }; }
    logDebug(`\n➡️ ${step.description}`);
    switch (step.action) {
      case "run_command": {
        const result = await runCommand(step.command);
        observations.push({ action: step.action, command: step.command, success: result.success, stdout: limitText(result.stdout), stderr: limitText(result.stderr), error: result.error });
        break;
      }
      case "create_file": {
        const result = createFile(step.path, step.content || "");
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "create_folder": {
        const result = createFolder(step.path);
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "read_file": {
        const resolvedPath = resolveExistingPath(step.path);
        const fileContent = readFile(resolvedPath);
        logDebug(`\n📖 File Content:\n`);
        logDebug(fileContent);
        observations.push({ action: step.action, requestedPath: step.path, path: resolvedPath, content: limitText(fileContent) });
        hasFreshInspection = true;
        break;
      }
      case "update_file": {
        const result = updateFile(step.path, step.content || "");
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "replace_file": {
        const result = replaceFile(step.path, step.content || "");
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "remove_test": {
        const result = removeTest(step.path, step.title || "");
        observations.push({ action: step.action, path: result.path || step.path, success: result.success, removedTitle: result.removedTitle || "", error: result.error || "" });
        break;
      }
      case "list_files": {
        const files = listFiles(step.path || ".");
        observations.push({ action: step.action, path: step.path || ".", files });
        hasFreshInspection = true;
        break;
      }
      case "chat": {
        logUser(`\n🤖 ${step.message}`);
        break;
      }
      default: {
        logUser(`\n⚠️ Unknown action: ${step.action}`);
      }
    }
  }
  logDebug("\n✅ Plan execution completed");
  return { observations, needsFollowUp: plan.steps.every(s => INSPECTION_ACTIONS.has(s.action)) };
}

async function ask() {
  rl.question("\nYou: ", async (input) => {
    if (input.toLowerCase() === "exit") { logUser("\nAgent stopped\n"); rl.close(); return; }
    const stopThinking = startThinking();
    let plan;
    try { plan = await createPlan(input); } finally { stopThinking(); }
    logDebug("\n");
    if (!plan) { ask(); return; }
    let observations = [];
    let cycles = 0;
    const maxCycles = 4;
    while (plan && cycles < maxCycles) {
      logDebug("\n📋 Generated Plan:\n");
      if (VERBOSE) console.dir(plan, { depth: null });
      const result = await executePlan(plan);
      observations = observations.concat(result.observations);
      if (!result.needsFollowUp) break;
      cycles++;
      const stopFollowUp = startThinking();
      try { plan = await createPlan(input, observations); } finally { stopFollowUp(); }
      logDebug("\n");
    }
    if (cycles === maxCycles) logUser("\n⚠️ Stopped after maximum planning cycles. Please give a more specific instruction.");
    const hasFailure = observations.some(o => o.success === false);
    if (!hasFailure) logUser("\nDone.");
    ask();
  });
}

console.clear();
if (VERBOSE) {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║         🚀 NAGARAJU AI AGENT 🚀              ║
║                                              ║
║      Playwright Automation Engineer          ║
║                                              ║
╚══════════════════════════════════════════════╝
`);
}
ask();
