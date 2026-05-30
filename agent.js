import dotenv from "dotenv";
import readline from "readline";
import fs from "fs";
import path from "path";
import { callTool as callFilesystemTool } from "./mcp/filesystem-server.js";
import { callTool as callCommandTool } from "./mcp/command-server.js";
import { callTool as callAiTool } from "./mcp/ai-server.js";

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function limitText(text, maxLength = 1000) {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

const INSPECTION_ACTIONS = new Set(["list_files", "read_file"]);
const MUTATION_ACTIONS = new Set(["create_file", "update_file", "replace_file", "remove_test", "create_folder", "run_command"]);

async function createPlan(input, observations = []) {
  const plan = await callAiTool("create_plan", { input, observations });
  if (!plan) { logUser("\n❌ Invalid JSON Response\n"); }
  return plan;
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
        if (isPlaywrightTestCommand(step.command)) {
          await callCommandTool("clean_artifacts", {});
        }

        console.log("\n🚀 EXEC:", step.command);

        const result = await callCommandTool("run_command", {
          command: step.command
        });

        console.log("\n📤 STDOUT:\n", result.stdout);
        console.log("\n📥 STDERR:\n", result.stderr);

        const success =
          result.success &&
          !result.stderr?.toLowerCase().includes("error") &&
          !result.stderr?.toLowerCase().includes("denied");

        observations.push({
          action: step.action,
          command: step.command,
          success,
          stdout: limitText(result.stdout),
          stderr: limitText(result.stderr),
          error: result.error || null
        });

        break;
      }
      case "create_file": {
        const result = await callFilesystemTool("create_file", { path: step.path, content: step.content || "" });
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "create_folder": {
        const result = await callFilesystemTool("create_folder", { path: step.path });
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "read_file": {
        const fileContent = await callFilesystemTool("read_file", { path: step.path });
        logDebug(`\n📖 File Content:\n`);
        logDebug(fileContent);
        observations.push({ action: step.action, path: step.path, content: limitText(fileContent) });
        hasFreshInspection = true;
        break;
      }
      case "update_file": {
        const result = await callFilesystemTool("update_file", { path: step.path, content: step.content || "" });
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "replace_file": {
        const result = await callFilesystemTool("replace_file", { path: step.path, content: step.content || "" });
        observations.push({ action: step.action, path: step.path, success: result.success, error: result.error || "" });
        break;
      }
      case "list_files": {
        const files = await callFilesystemTool("list_files", { path: step.path || "." });
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
