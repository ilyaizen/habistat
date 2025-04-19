import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const STATIC_DIR = "static";
const REQUIRED_ICONS = [
  { file: "app-192x192.png", size: 192 },
  { file: "app-512x512.png", size: 512 },
  { file: "maskable-icon-512x512.png", size: 512 }
];

async function verifyAndFixIcons() {
  for (const icon of REQUIRED_ICONS) {
    const filePath = path.join(STATIC_DIR, icon.file);
    try {
      const metadata = await sharp(filePath).metadata();
      console.log(`Checking ${icon.file}:`, metadata.width, "x", metadata.height);

      if (metadata.width !== icon.size || metadata.height !== icon.size) {
        console.log(`Resizing ${icon.file} to ${icon.size}x${icon.size}`);
        await sharp(filePath)
          .resize(icon.size, icon.size, {
            fit: "contain",
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(path.join(STATIC_DIR, `temp-${icon.file}`));

        await fs.rename(path.join(STATIC_DIR, `temp-${icon.file}`), filePath);
      }
    } catch (error) {
      console.error(`Error processing ${icon.file}:`, error);
    }
  }
}

verifyAndFixIcons().catch(console.error);
