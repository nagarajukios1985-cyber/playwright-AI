#!/usr/bin/env node
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const projectRoot = path.resolve(process.cwd());

// Packages the agent requires
const deps = [
  "playwright",      // Playwright test runner
  "dotenv",         // .env loader
  "openai"          // OpenAI client
];

function run(cmd, description) {
  console.log(`\n▶️  ${description}`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log("✅  Done");
  } catch (e) {
    console.error(`❌  Failed: ${description}`);
    process.exit(1);
  }
}

// 1️⃣ Install npm dependencies
run(`npm i -D ${deps.join(" ")}`, "Installing required dev dependencies");

// 2️⃣ Ensure package.json uses ES modules
const pkgPath = path.join(projectRoot, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
if (pkg.type !== "module") {
  pkg.type = "module";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("\n🛠️  Updated package.json → \"type\": \"module\"");
}

console.log(`
🚀  Setup complete!

Run the agent with:
  cd ${projectRoot}
  node agent.js
`);
