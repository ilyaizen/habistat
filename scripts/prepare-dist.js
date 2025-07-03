import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to copy directory recursively, excluding node_modules
function copyDir(src, dest, exclude = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip excluded directories
    if (exclude.includes(entry.name)) {
      console.log(`Skipping excluded directory: ${entry.name}`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean up existing dist-clean directory
const distCleanPath = path.join(__dirname, "..", "dist-clean");
if (fs.existsSync(distCleanPath)) {
  fs.rmSync(distCleanPath, { recursive: true, force: true });
}

// Copy dist to dist-clean, excluding node_modules
const distPath = path.join(__dirname, "..", "dist");
copyDir(distPath, distCleanPath, ["node_modules"]);

console.log("✅ Created clean distribution in dist-clean/ (excluding node_modules)");
