import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const sizes = [64, 192, 512];
const inputImage = "app-icon.png";
const outputDir = "static";

async function generateIcons() {
  try {
    const image = sharp(inputImage);
    const metadata = await image.metadata();

    if (metadata.width < 512 || metadata.height < 512) {
      console.error("Input image must be at least 512x512 pixels");
      process.exit(1);
    }

    // Generate regular icons
    for (const size of sizes) {
      await image
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, `pwa-${size}x${size}.png`));
    }

    // Generate maskable icon (with padding for safe area)
    await image
      .resize(512, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, "maskable-icon-512x512.png"));

    console.log("PWA icons generated successfully");
  } catch (error) {
    console.error("Error generating PWA icons:", error);
    process.exit(1);
  }
}

generateIcons();
