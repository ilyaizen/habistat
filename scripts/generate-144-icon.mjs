import sharp from "sharp";
import path from "path";

const STATIC_DIR = "static";
const SOURCE_ICON = path.join(STATIC_DIR, "app-192x192.png");
const TARGET_ICON = path.join(STATIC_DIR, "app-144x144.png");

async function generate144Icon() {
  try {
    await sharp(SOURCE_ICON)
      .resize(144, 144, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(TARGET_ICON);

    console.log("Generated 144x144 icon successfully");
  } catch (error) {
    console.error("Error generating 144x144 icon:", error);
  }
}

generate144Icon();
