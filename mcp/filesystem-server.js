import fs from "fs";
import path from "path";

const tools = {
  read_file: ({ path: filePath }) => {
    return fs.readFileSync(filePath, "utf8");
  },

  create_file: ({ path: filePath, content = "" }) => {
    const dir = path.dirname(filePath);
    if (dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    return { success: true, path: filePath };
  },

  create_folder: ({ path: folderPath }) => {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return { success: true, path: folderPath };
  },

  list_files: ({ path: folder = "." }) => {
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
  },

  update_file: ({ path: filePath, content = "" }) => {
    fs.appendFileSync(filePath, content);
    return { success: true, path: filePath };
  },

  replace_file: ({ path: filePath, content = "" }) => {
    fs.writeFileSync(filePath, content);
    return { success: true, path: filePath };
  }
};

export async function callTool(name, args) {
  return tools[name](args);
}
