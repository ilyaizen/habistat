// virtual-garden.ts
// This file contains the p5.js sketch for the virtual garden.
// It is responsible for generating the garden's plants and background.
// It is also responsible for updating the garden's configuration when the user's progress changes.

import type p5 from "p5";
import { getSessionId } from "$lib/utils/tracking";

interface PlantColorPalette {
  stem: number[];
  leaf: number[];
  petal1: number[];
  petal2: number[];
  center: number[];
}

interface GardenConfig {
  completions: { habitId: string; date: string }[];
  habits: { _id: string; name: string; color: string }[];
  weeklyDelta: number;
}

/**
 * This function converts a non-numeric session ID into a stable numeric seed.
 * This ensures that the generated garden is visually consistent and reproducible
 * for the same user across different sessions or page loads.
 * It uses a simple hashing algorithm to generate a number from the string.
 * @param sessionId - The user's session identifier string.
 * @returns A numeric seed for the random number generator.
 */
function sessionIdToSeed(sessionId: string | null): number {
  if (!sessionId) return 42; // Default seed if no session ID is available
  let seed = 0;
  for (let i = 0; i < Math.min(8, sessionId.length); i++) {
    seed = (seed << 5) - seed + sessionId.charCodeAt(i);
    seed = seed & seed;
  }
  return Math.abs(seed) || 42;
}

/**
 * A curated set of HSB color palettes to ensure a soft, aesthetically pleasing
 * and cohesive look for the plants. Each palette defines colors for the stem,
 * leaves, petals (primary and secondary for layered flowers), and the flower's center.
 */
const plantColors: PlantColorPalette[] = [
  {
    stem: [140, 40, 70],
    leaf: [120, 45, 60],
    petal1: [280, 50, 95],
    petal2: [280, 30, 100],
    center: [50, 80, 100]
  },
  {
    stem: [130, 40, 65],
    leaf: [110, 45, 55],
    petal1: [30, 80, 100],
    petal2: [40, 60, 100],
    center: [45, 100, 90]
  },
  {
    stem: [20, 80, 95],
    leaf: [130, 40, 50],
    petal1: [205, 70, 90],
    petal2: [200, 40, 100],
    center: [60, 30, 100]
  },
  {
    stem: [145, 35, 75],
    leaf: [125, 40, 65],
    petal1: [340, 60, 100],
    petal2: [330, 80, 95],
    center: [350, 30, 100]
  }
];

/**
 * Represents a single plant within the virtual garden.
 * Each plant has its own unique "DNA" (color, shape, size) and growth lifecycle.
 * It is now positioned in 3D space.
 */
class Plant {
  p: p5; // The p5.js instance, passed in to ensure all p5 functions are called correctly.
  x: number; // The x-coordinate of the plant's base (left/right).
  y: number; // The y-coordinate of the plant's base (on the ground plane).
  z: number; // The z-coordinate of the plant's base (depth/perspective).
  maxHeight: number; // The maximum potential height of the plant.
  growth: number = 0; // The current growth progress, from 0 (seed) to 1 (fully grown).
  targetGrowth: number = 1; // The growth level this plant aims to reach.

  // --- Plant DNA ---
  // These properties are randomized once at creation to give each plant a unique appearance.
  colors: PlantColorPalette; // The color palette selected from plantColors.
  leafCount: number; // The number of leaves on the stem.
  stemWidth: number; // The base width of the stem.
  stemNoiseSeed: number; // A seed for Perlin noise to create a unique, organic curve for the stem.
  stemCurveFactor: number; // A random multiplier to vary the stem's curve.
  growthRateNoiseSeed: number; // A seed for Perlin noise to create varied, non-linear growth spurts.
  leafSizeFactor: number; // A random multiplier for individual leaf size variation.
  flowerParams: {
    petalCount: number;
    type: "simple" | "layered" | "bell"; // The structural type of the flower.
    size: number; // A size multiplier for the flower head.
  };

  /**
   * Creates a new Plant instance.
   * @param x - The base x-position of the plant.
   * @param y - The base y-position of the plant.
   * @param z - The base z-position of the plant for perspective.
   * @param height - The maximum height the plant can grow to.
   * @param maturityLevel - The initial growth state (0 to 1).
   * @param p - The p5.js instance.
   */
  constructor(x: number, y: number, z: number, height: number, maturityLevel: number, p: p5) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.z = z; // Store the depth coordinate.
    this.maxHeight = height;

    // --- Assign unique "DNA" to the plant using the p5 random number generator ---
    const randomizeColor = (color: number[], h = 10, s = 10, b = 10) => {
      const newColor = [
        color[0] + p.random(-h, h),
        color[1] + p.random(-s, s),
        color[2] + p.random(-b, b)
      ];
      newColor[0] = (newColor[0] + 360) % 360; // Hue wraps around
      newColor[1] = p.constrain(newColor[1], 20, 100); // Saturation
      newColor[2] = p.constrain(newColor[2], 20, 100); // Brightness
      return newColor;
    };
    const baseColors = p.random(plantColors);
    this.colors = {
      stem: randomizeColor(baseColors.stem, 5, 10, 10),
      leaf: randomizeColor(baseColors.leaf, 5, 15, 15),
      petal1: randomizeColor(baseColors.petal1, 20, 20, 10),
      petal2: randomizeColor(baseColors.petal2, 20, 20, 10),
      center: randomizeColor(baseColors.center, 15, 20, 10)
    };

    this.leafCount = Math.floor(p.random(2, 9));
    this.stemWidth = p.random(6, 14);
    this.stemNoiseSeed = p.random(1000); // Seeds ensure noise is repeatable for this plant.
    this.stemCurveFactor = p.random(15, 40);
    this.growthRateNoiseSeed = p.random(1000);
    this.leafSizeFactor = p.random(0.3, 0.7); // Each plant gets a unique base size for its leaves.

    // Randomly select a flower type.
    const flowerTypes: ("simple" | "layered" | "bell")[] = ["simple", "layered", "bell"];
    this.flowerParams = {
      petalCount: p.int(p.random(4, 13)),
      type: p.random(flowerTypes),
      size: p.random(0.2, 0.65)
    };

    // The target growth is influenced by its initial maturity level.
    this.targetGrowth = 0.4 + maturityLevel * 0.2;
  }

  /**
   * Updates the plant's growth state on each frame.
   * Growth is non-linear, using Perlin noise to simulate natural spurts.
   */
  grow() {
    if (this.growth < this.targetGrowth) {
      // Use noise to create a more organic, fluctuating growth rate.
      const baseRate = 0.005;
      const dynamicRate = this.p.noise(this.growthRateNoiseSeed + this.p.frameCount * 0.01) * 0.008;
      this.growth += baseRate + dynamicRate;
      this.growth = this.p.min(this.growth, this.targetGrowth);
    }
  }

  /**
   * Renders the entire plant, applying fog based on its depth.
   * @param fogColor - The color of the fog.
   * @param fogNear - The z-distance where fog starts.
   * @param fogFar - The z-distance where fog is at maximum.
   * @param weeklyDelta - The user's progress delta, for animations.
   */
  draw(fogColor: p5.Color, fogNear: number, fogFar: number, weeklyDelta: number) {
    if (this.growth <= 0) return;
    const p = this.p;

    // Calculate fog amount based on this plant's z-position.
    // The amount is a value from 0 (no fog) to 1 (full fog).
    const fogAmount = p.map(this.z, fogNear, fogFar, 0, 1, true);

    p.push();
    // Translate to the plant's position in 3D space.
    p.translate(this.x, this.y, this.z);
    p.colorMode(p.HSB); // Set color mode for this plant's drawing operations.

    // 1. Draw the stem and get the position of its tip for the flower.
    const stemTip = this.drawStem(fogColor, fogAmount);

    // 2. Draw leaves along the stem.
    if (this.growth > 0.2) {
      for (let i = 0; i < this.leafCount; i++) {
        const leafHeight = (i + 1) / (this.leafCount + 1);
        if (this.growth > leafHeight) {
          this.drawLeaf(leafHeight, i % 2 === 0, fogColor, fogAmount);
        }
      }
    }

    // 3. Draw the flower at the stem's tip, only when the plant is mature enough.
    // The threshold is relative to the plant's own target growth.
    const flowerMaturityThreshold = this.targetGrowth * 0.85;
    if (this.growth > flowerMaturityThreshold) {
      const flowerGrowth = p.map(
        this.growth,
        flowerMaturityThreshold,
        this.targetGrowth,
        0,
        1,
        true
      );
      p.push();
      p.translate(stemTip.x, stemTip.y);
      this.drawFlower(flowerGrowth, fogColor, fogAmount, weeklyDelta);
      p.pop();
    }

    p.pop();
  }

  /**
   * Helper function to blend a plant's color with the scene's fog.
   * @param originalColorHSB - The original HSB color array of the plant part.
   * @param fogColor - The p5.Color object for the fog.
   * @param fogAmount - The intensity of the fog (0 to 1).
   * @returns The final, fog-blended p5.Color.
   */
  private getFoggedColor(
    originalColorHSB: number[],
    fogColor: p5.Color,
    fogAmount: number
  ): p5.Color {
    const originalP5Color = this.p.color(originalColorHSB);
    return this.p.lerpColor(originalP5Color, fogColor, fogAmount);
  }

  /**
   * Draws a curved, tapering stem, applying the fog effect.
   */
  drawStem(fogColor: p5.Color, fogAmount: number) {
    const p = this.p;
    const currentHeight = this.maxHeight * this.growth;
    if (currentHeight <= 0) return p.createVector(0, 0);

    const baseWidth = this.stemWidth;
    const tipWidth = 1;

    // Apply fog to the stem color.
    p.fill(this.getFoggedColor(this.colors.stem, fogColor, fogAmount));
    p.noStroke();

    const points: { x: number; y: number; width: number }[] = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const h = (i / segments) * -currentHeight;
      const progress = i / segments;
      const curve =
        (p.noise(this.stemNoiseSeed + progress * 2) - 0.5) * this.stemCurveFactor * this.growth;
      const width = tipWidth + (baseWidth - tipWidth) * p.pow(1 - progress, 3);
      points.push({ x: curve, y: h, width: width });
    }

    p.beginShape();
    for (const pt of points) {
      p.vertex(pt.x + pt.width / 2, pt.y);
    }
    for (let i = points.length - 1; i >= 0; i--) {
      const pt = points[i];
      p.vertex(pt.x - pt.width / 2, pt.y);
    }
    p.endShape(p.CLOSE);

    return points.length > 0
      ? p.createVector(points[points.length - 1].x, points[points.length - 1].y)
      : p.createVector(0, 0);
  }

  /**
   * Draws a single leaf on the stem, applying the fog effect.
   */
  drawLeaf(heightPercent: number, isRight: boolean, fogColor: p5.Color, fogAmount: number) {
    const p = this.p;
    const currentHeight = this.maxHeight * this.growth;
    const y = -currentHeight * heightPercent;
    const progress = y / -currentHeight;
    const x =
      (p.noise(this.stemNoiseSeed + progress * 2) - 0.5) * this.stemCurveFactor * this.growth;
    const direction = isRight ? 1 : -1;
    const angle = p.radians(-60 * direction);
    const baseLeafSize = 5 + this.growth * 20;
    const leafSize = baseLeafSize * this.leafSizeFactor;

    p.push();
    p.translate(x, y);
    p.rotate(angle);
    // Apply fog to the leaf color.
    p.fill(this.getFoggedColor(this.colors.leaf, fogColor, fogAmount));
    p.noStroke();
    p.ellipse(leafSize * 0.4 * direction, 0, leafSize, leafSize / 2);
    p.pop();
  }

  /**
   * Draws the flower head, applying the fog effect and a "bloop" animation.
   * @param growth - The current growth of the flower (0 to 1).
   * @param fogColor - The color of the fog.
   * @param fogAmount - The intensity of the fog (0 to 1).
   * @param weeklyDelta - The user's progress delta, for animations.
   */
  drawFlower(growth: number, fogColor: p5.Color, fogAmount: number, weeklyDelta: number) {
    const p = this.p;
    p.push();

    // The "bloop" effect: If the user has high positive progress, make the flower
    // pulse with a larger size.
    let sizeMultiplier = growth * this.flowerParams.size;
    if (weeklyDelta > 20) {
      const bloopAmount = p.map(weeklyDelta, 20, 100, 1, 1.5, true); // Scale up to 1.5x
      // A gentle sine wave pulse. The rate is slow for a calming effect.
      const pulse = 1 + p.sin(p.frameCount * 0.05) * 0.1;
      sizeMultiplier *= bloopAmount * pulse;
    }

    p.scale(sizeMultiplier);
    p.noStroke();

    const { type, petalCount } = this.flowerParams;
    const angleStep = p.TWO_PI / petalCount;
    // Pre-calculate fogged colors for the flower parts.
    const petal1Color = this.getFoggedColor(this.colors.petal1, fogColor, fogAmount);
    const petal2Color = this.getFoggedColor(this.colors.petal2, fogColor, fogAmount);
    const centerColor = this.getFoggedColor(this.colors.center, fogColor, fogAmount);

    if (type === "bell") {
      p.fill(petal1Color);
      p.ellipse(0, 10, 25, 25);
    } else {
      if (type === "layered") {
        p.fill(petal2Color);
        for (let i = 0; i < petalCount; i++) {
          p.push();
          p.rotate(i * angleStep + angleStep / 2);
          p.ellipse(15, 0, 25, 15);
          p.pop();
        }
      }

      p.fill(petal1Color);
      for (let i = 0; i < petalCount; i++) {
        p.push();
        p.rotate(i * angleStep);
        p.ellipse(15, 0, 30, 12);
        p.pop();
      }
    }

    p.fill(centerColor);
    p.ellipse(0, 0, 15, 15);

    p.pop();
  }
}

/**
 * Manages the entire p5.js sketch, including the scene (sky, ground) and all Plant objects.
 */
export class VirtualGardenSketch {
  public p: p5;
  private gardenConfig: GardenConfig;
  private plants: Plant[] = [];
  private sceneProperties: { fogColor: p5.Color; fogNear: number; fogFar: number } | null = null;
  private gardenDepth: number = 0;
  private camera: p5.Camera; // Use the p5.Camera type for the camera object.

  constructor(p: p5, initialGardenConfig: GardenConfig) {
    this.p = p;
    this.gardenConfig = initialGardenConfig;
    // The default p5 camera can be accessed but might not be a full `p5.Camera` instance
    // until it's explicitly created. Let's create it to be safe.
    this.camera = p.createCamera();
  }

  public updateData(newConfig: GardenConfig) {
    // If the data is meaningfully different, regenerate the garden.
    if (JSON.stringify(this.gardenConfig) !== JSON.stringify(newConfig)) {
      this.gardenConfig = newConfig;
      this.generateGarden();
    }
  }

  public setup = (containerRef: HTMLDivElement) => {
    const p = this.p;
    const { width, height } = containerRef.getBoundingClientRect();
    const canvas = p.createCanvas(width, height, p.WEBGL);
    canvas.parent(containerRef);
    this.gardenDepth = p.width * 1.5; // Define garden depth once
    this.generateGarden();
  };

  public draw = () => {
    const p = this.p;
    p.colorMode(p.HSB);

    // Draw the 3D scene and get properties needed for fog.
    this.sceneProperties = this.drawScene();
    const weeklyDelta = this.gardenConfig.weeklyDelta || 0;

    // Update and draw each plant, passing the fog properties.
    for (const plant of this.plants) {
      plant.grow();
      if (this.sceneProperties) {
        plant.draw(
          this.sceneProperties.fogColor,
          this.sceneProperties.fogNear,
          this.sceneProperties.fogFar,
          weeklyDelta
        );
      }
    }
  };

  private generateGarden() {
    const p = this.p;
    this.plants = [];
    p.randomSeed(sessionIdToSeed(getSessionId()));

    const plantCount = Math.max(1, Math.min(15, this.gardenConfig.completions.length));
    const baseGrowth = Math.max(0, Math.min(1, this.gardenConfig.completions.length / 10));
    const weeklyDelta = this.gardenConfig.weeklyDelta || 0;
    const weeklyGrowth = Math.max(0, Math.min(1, (weeklyDelta + 50) / 100));

    const gardenWidth = p.width * 0.9;
    const groundLevel = p.height / 4;
    const segmentWidth = gardenWidth / plantCount;

    for (let i = 0; i < plantCount; i++) {
      const segmentStart = -gardenWidth / 2 + i * segmentWidth;
      const x = p.random(segmentStart, segmentStart + segmentWidth);
      const z = p.random(-this.gardenDepth / 2, this.gardenDepth / 2);
      const baseHeight = 80 + weeklyGrowth * 80;
      const height = baseHeight + p.random(-60, 60);
      const plant = new Plant(x, groundLevel, z, height, baseGrowth, p);
      this.plants.push(plant);
    }
    this.plants.sort((a, b) => b.z - a.z);
  }

  private drawScene() {
    const p = this.p;
    const timeOfDay = this.gardenConfig.completions.length > 0 ? "night" : "day";
    const weeklyDelta = this.gardenConfig.weeklyDelta || 0;
    const isNegative = weeklyDelta < 0;

    let skyTop: number[], skyBottom: number[], sunColor: number[];
    if (timeOfDay === "night") {
      skyTop = [240, 70, 10];
      skyBottom = [240, 60, 35];
      sunColor = [60, 20, 100];
    } else {
      skyTop = [210, 80, 95];
      skyBottom = [200, 50, 100];
      sunColor = [50, 70, 95];
    }

    const hillHue = isNegative ? 45 : 120;
    const groundNearColor: number[] = [hillHue, isNegative ? 40 : 30, 90];
    const groundFarColor: number[] = [hillHue, isNegative ? 60 : 50, 60];

    p.background(skyBottom[0], skyBottom[1], skyBottom[2]);
    p.noStroke();

    // The camera is positioned to provide a stable, slightly elevated overview of the garden.
    // It's pulled back to ensure the entire scene, including the sky and ground, is visible.
    // The camera looks slightly down towards the horizon.
    const cameraY = -p.height * 0.2;
    const cameraZ = p.height / p.tan(p.PI / 18); // Position camera for a 30-degree field of view.
    p.camera(0, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);

    p.ambientLight(150);
    p.directionalLight(p.color(255, 255, 240), 0.5, -1, -0.5);

    p.push();
    p.translate(0, 0, -p.width * 2);
    p.beginShape();
    p.fill(skyTop[0], skyTop[1], skyTop[2]);
    p.vertex(-p.width * 3, -p.height * 3);
    p.vertex(p.width * 3, -p.height * 3);
    p.fill(skyBottom[0], skyBottom[1], skyBottom[2]);
    p.vertex(p.width * 3, p.height * 3);
    p.vertex(-p.width * 3, p.height * 3);
    p.endShape(p.CLOSE);
    p.pop();

    p.push();
    const sunX = timeOfDay === "night" ? -p.width * 0.7 : p.width * 0.8;
    const sunY = -p.height * 0.6;
    const sunZ = -p.width * 1.5;
    p.translate(sunX, sunY, sunZ);
    p.emissiveMaterial(sunColor[0], sunColor[1], sunColor[2]);
    p.sphere(p.width * 0.1);
    p.pop();

    // Draw ground plane
    p.push();
    p.noStroke();
    p.translate(0, 0, -this.gardenDepth / 2); // Center ground plane
    p.rotateX(p.HALF_PI);

    // Gradient from back to front
    const nearDist = this.gardenDepth / 2;
    const farDist = -this.gardenDepth / 2;
    const segments = 30;
    for (let i = 0; i < segments; i++) {
      const z1 = p.map(i, 0, segments, farDist, nearDist);
      const z2 = p.map(i + 1, 0, segments, farDist, nearDist);
      p.beginShape(p.QUAD_STRIP);

      const c1 = p.lerpColor(
        p.color(groundFarColor[0], groundFarColor[1], groundFarColor[2]),
        p.color(groundNearColor[0], groundNearColor[1], groundNearColor[2]),
        i / segments
      );
      p.fill(c1);
      p.vertex(-p.width * 2, z1);
      p.vertex(p.width * 2, z1);

      const c2 = p.lerpColor(
        p.color(groundFarColor[0], groundFarColor[1], groundFarColor[2]),
        p.color(groundNearColor[0], groundNearColor[1], groundNearColor[2]),
        (i + 1) / segments
      );
      p.fill(c2);
      p.vertex(-p.width * 2, z2);
      p.vertex(p.width * 2, z2);
      p.endShape();
    }
    p.pop();

    // NEW: Define fog properties to be used by the plants.
    // The fog color matches the bottom of the sky for a seamless blend.
    const fogColor = p.color(skyBottom);
    // Fog starts at the center of the garden and gets stronger towards the back.
    const fogNear = 0;
    const fogFar = this.gardenDepth / 2;

    return { fogColor, fogNear, fogFar };
  }
}
