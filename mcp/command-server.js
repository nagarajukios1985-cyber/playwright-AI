import { exec } from "child_process";
import path from "path";
import fs from "fs";

const tools = {
  run_command: ({ command }) => {
    return new Promise((resolve) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout = "", stderr = "") => {
        resolve({ success: !error, stdout, stderr, error: error?.message || "" });
      });
    });
  },

  clean_artifacts: () => {
    const artifactsPath = path.resolve("artifacts");
    fs.rmSync(artifactsPath, { recursive: true, force: true });
    return { success: true };
  }
};

export async function callTool(name, args) {
  return tools[name](args);
}
