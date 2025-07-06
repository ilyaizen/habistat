import type p5 from "p5";
import { getSessionId } from "$lib/utils/tracking";

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
const plantColors = [
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
 */
class Plant {
  p: p5; // The p5.js instance, passed in to ensure all p5 functions are called correctly.
  x: number; // The x-coordinate of the plant's base.
  y: number; // The y-coordinate of the plant's base, aligned with the hill.
  maxHeight: number; // The maximum potential height of the plant.
  growth: number = 0; // The current growth progress, from 0 (seed) to 1 (fully grown).
  targetGrowth: number = 1; // The growth level this plant aims to reach.

  // --- Plant DNA ---
  // These properties are randomized once at creation to give each plant a unique appearance.
  colors: any; // The color palette selected from plantColors.
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
   * @param height - The maximum height the plant can grow to.
   * @param maturityLevel - The initial growth state (0 to 1).
   * @param p - The p5.js instance.
   */
  constructor(x: number, y: number, height: number, maturityLevel: number, p: p5) {
    this.p = p;
    this.x = x;
    this.y = y;
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
    const baseColors = plantColors[Math.floor(p.random(plantColors.length))];
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
    this.leafSizeFactor = p.random(0.6, 1.6); // Each plant gets a unique base size for its leaves.

    // Randomly select a flower type.
    const flowerTypes: ("simple" | "layered" | "bell")[] = ["simple", "layered", "bell"];
    this.flowerParams = {
      petalCount: p.int(p.random(4, 13)),
      type: p.random(flowerTypes),
      size: p.random(0.2, 0.65)
    };

    // The target growth is influenced by its initial maturity level.
    this.targetGrowth = 0.8 + maturityLevel * 0.2;
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
   * Renders the entire plant (stem, leaves, and flower) to the canvas.
   * Different parts of the plant become visible as its growth progresses.
   */
  draw() {
    if (this.growth <= 0) return;
    const p = this.p;

    p.push();
    p.translate(this.x, this.y);
    p.colorMode(p.HSB); // Set color mode for this plant's drawing operations.

    // 1. Draw the stem and get the position of its tip for the flower.
    const stemTip = this.drawStem();

    // 2. Draw leaves along the stem once the plant is mature enough.
    if (this.growth > 0.2) {
      for (let i = 0; i < this.leafCount; i++) {
        // Stagger leaves along the stem's height.
        const leafHeight = (i + 1) / (this.leafCount + 1);
        // Only draw the leaf if the plant has grown past its position.
        if (this.growth > leafHeight) {
          this.drawLeaf(leafHeight, i % 2 === 0); // Alternate leaves left and right.
        }
      }
    }

    // 3. Draw the flower at the stem's tip once it's ready to bloom.
    if (this.growth > 0.7) {
      // The flower's own growth animation starts after the stem is mostly grown.
      const flowerGrowth = p.map(this.growth, 0.7, 1.0, 0, 1, true);
      p.push();
      p.translate(stemTip.x, stemTip.y);
      this.drawFlower(flowerGrowth);
      p.pop();
    }

    p.pop();
  }

  /**
   * Draws a curved, tapering stem.
   * The curve is generated with Perlin noise for a natural look.
   * @returns The p5.Vector position of the stem's tip.
   */
  drawStem() {
    const p = this.p;
    const currentHeight = this.maxHeight * this.growth;
    if (currentHeight <= 0) return p.createVector(0, 0); // Guard against zero height.

    const baseWidth = this.stemWidth;
    const tipWidth = 1; // Stem should taper to a point.

    p.fill(this.colors.stem[0], this.colors.stem[1], this.colors.stem[2]);
    p.noStroke();

    const points: { x: number; y: number; width: number }[] = [];
    const segments = 20; // More segments create a smoother curve.
    for (let i = 0; i <= segments; i++) {
      const h = (i / segments) * -currentHeight;
      const progress = i / segments;
      // Use Perlin noise to create a gentle, organic side-to-side curve.
      const curve =
        (p.noise(this.stemNoiseSeed + progress * 2) - 0.5) * this.stemCurveFactor * this.growth;

      // Manual linear interpolation to calculate the stem's width at this point.
      // This was implemented to bypass a p5.js `lerp()` bug where it received NaN.
      const width = tipWidth + (baseWidth - tipWidth) * p.pow(1 - progress, 3);

      points.push({ x: curve, y: h, width: width });
    }

    // Draw the stem shape using the calculated points.
    p.beginShape();
    // Draw the right side of the stem.
    for (const pt of points) {
      p.vertex(pt.x + pt.width / 2, pt.y);
    }
    // Draw the left side of the stem in reverse to close the shape.
    for (let i = points.length - 1; i >= 0; i--) {
      const pt = points[i];
      p.vertex(pt.x - pt.width / 2, pt.y);
    }
    p.endShape(p.CLOSE);

    // Return the coordinates of the last point (the tip of the stem).
    return points.length > 0
      ? p.createVector(points[points.length - 1].x, points[points.length - 1].y)
      : p.createVector(0, 0);
  }

  /**
   * Draws a single leaf on the stem.
   * @param heightPercent - The vertical position on the stem (0 to 1).
   * @param isRight - Whether the leaf should be on the right or left side.
   */
  drawLeaf(heightPercent: number, isRight: boolean) {
    const p = this.p;
    const currentHeight = this.maxHeight * this.growth;
    const y = -currentHeight * heightPercent;
    const progress = y / -currentHeight;

    // Calculate the leaf's base position on the *curved* stem, not a straight line.
    const x =
      (p.noise(this.stemNoiseSeed + progress * 2) - 0.5) * this.stemCurveFactor * this.growth;
    const direction = isRight ? 1 : -1;
    const angle = p.radians(-60 * direction);

    // Leaf size is now highly variable. It depends on the overall plant growth (maturity)
    // and a random "DNA" factor unique to each plant, creating more visual diversity.
    const baseLeafSize = 5 + this.growth * 20;
    const leafSize = baseLeafSize * this.leafSizeFactor;

    p.push();
    p.translate(x, y);
    p.rotate(angle);
    p.fill(this.colors.leaf[0], this.colors.leaf[1], this.colors.leaf[2]);
    p.noStroke();

    // Draw a more shapely leaf using curveVertex for a natural, flowing shape.
    // p.beginShape();
    // p.curveVertex(0, 0);
    // p.curveVertex(0, 0);
    // p.curveVertex((leafSize * 0.5 * direction) / 2, -leafSize * 0.3);
    // p.curveVertex(leafSize * direction, 0);
    // p.curveVertex((leafSize * 0.5 * direction) / 2, leafSize * 0.3);
    // p.curveVertex(0, 0);
    // p.curveVertex(0, 0);
    // p.endShape();

    // DEBUG: Use a simple ellipse to bypass the curveVertex error for now.
    p.ellipse(leafSize * 0.4 * direction, 0, leafSize, leafSize / 2);

    p.pop();
  }

  /**
   * Draws the flower head at the tip of the stem.
   * Supports different visual styles like "simple", "layered", or "bell".
   * @param growth - The growth progress of the flower itself (0 to 1).
   */
  drawFlower(growth: number) {
    const p = this.p;
    p.push();
    p.scale(growth * this.flowerParams.size); // The flower scales up as it blooms.
    p.noStroke();

    const { type, petalCount } = this.flowerParams;
    const { petal1, petal2, center } = this.colors;
    const angleStep = p.TWO_PI / petalCount;

    if (type === "bell") {
      p.fill(petal1[0], petal1[1], petal1[2]);
      p.ellipse(0, 10, 25, 25);
    } else {
      if (type === "layered") {
        p.fill(petal2[0], petal2[1], petal2[2]);
        for (let i = 0; i < petalCount; i++) {
          p.push();
          p.rotate(i * angleStep + angleStep / 2);
          p.ellipse(15, 0, 25, 15);
          p.pop();
        }
      }

      p.fill(petal1[0], petal1[1], petal1[2]);
      for (let i = 0; i < petalCount; i++) {
        p.push();
        p.rotate(i * angleStep);
        p.ellipse(15, 0, 30, 12);
        p.pop();
      }
    }

    p.fill(center[0], center[1], center[2]);
    p.ellipse(0, 0, 15, 15);

    p.pop();
  }
}

/**
 * Manages the entire p5.js sketch, including the scene (sky, hill) and all Plant objects.
 * This class serves as the main controller that is instantiated by the Svelte component.
 */
export class VirtualGardenSketch {
  public p: p5; // The p5.js instance.
  private gardenConfig: any; // Configuration data passed from Svelte (e.g., plant count, time of day).
  private plants: Plant[] = []; // An array to hold all the Plant objects in the garden.
  private hillPoints: number[] = []; // Stores the y-coordinates for the hill's curve.
  private backgroundLayer!: p5.Graphics; // A graphics buffer for caching the static background scene.

  constructor(p: p5, initialGardenConfig: any) {
    this.p = p;
    this.gardenConfig = initialGardenConfig || {};
  }

  /**
   * Updates the garden's configuration with new data from the Svelte component.
   * This function is optimized to only trigger expensive redraws when necessary.
   * @param newConfig - The new configuration object.
   */
  public updateData(newConfig: any) {
    const oldConfig = this.gardenConfig;
    this.gardenConfig = newConfig || {};

    // To avoid jarring changes, the garden is only regenerated if the number of plants changes.
    if ((oldConfig.plantCount || 3) !== (this.gardenConfig.plantCount || 3)) {
      this.generateGarden();
    }

    // The background is computationally expensive to draw. It should only be redrawn
    // to its off-screen buffer when relevant data (like time of day) actually changes.
    if (
      this.backgroundLayer &&
      (oldConfig.timeOfDay !== this.gardenConfig.timeOfDay ||
        oldConfig.weeklyPointsDelta !== this.gardenConfig.weeklyPointsDelta)
    ) {
      this.drawSceneToBuffer();
    }
  }

  /**
   * The p5.js setup function. Called once when the sketch starts.
   * It initializes the canvas, creates the background buffer, and generates the initial garden state.
   * @param containerRef - The HTML element to mount the canvas into.
   */
  public setup = (containerRef: HTMLDivElement) => {
    const p = this.p;
    const { width, height } = containerRef.getBoundingClientRect();
    const canvas = p.createCanvas(width, height);
    canvas.parent(containerRef);

    // Create a graphics buffer to cache the background.
    this.backgroundLayer = p.createGraphics(width, height);

    this.generateHill();
    this.drawSceneToBuffer(); // Draw the initial background.
    this.generateGarden();
  };

  /**
   * The p5.js draw function. Called continuously in a loop to render the animation.
   * This is now highly optimized: it just draws the cached background image and then the plants.
   */
  public draw = () => {
    const p = this.p;
    // Blit the pre-rendered background from the buffer onto the main canvas.
    p.image(this.backgroundLayer, 0, 0);

    // Update and draw each plant in the garden.
    for (const plant of this.plants) {
      plant.grow();
      plant.draw();
    }
  };

  /**
   * Generates the points for the rolling hill at the bottom of the scene.
   * Uses Perlin noise to create a smooth, natural-looking curve.
   */
  private generateHill() {
    const p = this.p;
    this.hillPoints = [];

    // Generate a series of y-coordinates for the hill's surface.
    for (let x = 0; x <= p.width; x += 10) {
      const hillHeight = p.noise(x * 0.01) * 15 + 20; // Noise creates gentle rolling.
      this.hillPoints.push(p.height - hillHeight);
    }
  }

  /**
   * (Re)generates the entire collection of plants in the garden.
   * This is called on initial setup and when the plant count changes.
   */
  private generateGarden() {
    const p = this.p;
    this.plants = [];

    // Use a consistent seed based on the session ID. This makes the garden's layout
    // and plant "DNA" reproducible for the same user.
    p.randomSeed(sessionIdToSeed(getSessionId()));

    const plantCount = Math.max(1, Math.min(15, this.gardenConfig.plantCount || 3));
    const baseGrowth = Math.max(0, Math.min(1, this.gardenConfig.baseGrowth || 0.5));
    const weeklyDelta = this.gardenConfig.weeklyPointsDelta || 0;
    // Map weekly progress to a growth factor for plant height.
    const weeklyGrowth = Math.max(0, Math.min(1, (weeklyDelta + 50) / 100));

    const availableWidth = p.width * 0.8;
    const segmentWidth = availableWidth / plantCount;
    const startX = p.width * 0.1;

    for (let i = 0; i < plantCount; i++) {
      // To ensure a more natural, dispersed look, we place each plant
      // randomly within its own designated segment of the canvas.
      const segmentStart = startX + i * segmentWidth;
      const x = p.random(segmentStart, segmentStart + segmentWidth);

      // Find the corresponding height of the hill at this x-position.
      const hillIndex = Math.floor(x / 10);
      const y = this.hillPoints[hillIndex] || p.height - 25;

      // Plant height is influenced by weekly progress, with some random variation.
      // A wider random range is used here to create more visible height differences.
      const baseHeight = 40 + weeklyGrowth * 40;
      const height = baseHeight + p.random(-35, 35);

      const plant = new Plant(x, y, height, baseGrowth, p);
      this.plants.push(plant);
    }

    // Sort plants by y-coordinate to create a simple depth effect.
    // Plants further down the screen (higher y-value) will be drawn on top of others.
    this.plants.sort((a, b) => a.y - b.y);
  }

  /**
   * Draws the background scene, including the sky, sun/moon, and hill.
   * The colors and elements change based on the time of day and user progress.
   * This function now draws to the off-screen buffer instead of the main canvas.
   */
  private drawSceneToBuffer() {
    const p = this.backgroundLayer; // Target the graphics buffer for all drawing operations.
    const timeOfDay = this.gardenConfig.timeOfDay || "day";
    const weeklyDelta = this.gardenConfig.weeklyPointsDelta || 0;
    const isNegative = weeklyDelta < 0;

    // The graphics buffer (`p`) needs its color mode set explicitly to HSB.
    // This must be done *before* the push/pop block to ensure the state is set correctly.
    p.colorMode(this.p.HSB);

    p.push();

    // Set sky and sun/moon colors based on the time of day from the config.
    let skyColor = [200, 60, 85]; // Day
    let sunColor = [50, 70, 95];
    let sunSize = 25;

    if (timeOfDay === "night") {
      skyColor = [220, 60, 25];
      sunColor = [60, 30, 80]; // Moon
      sunSize = 20;
    } else if (timeOfDay === "twilight") {
      skyColor = [280, 50, 45];
      sunColor = [30, 80, 90];
    }

    p.background(p.color(skyColor));

    // Sun/Moon
    p.fill(p.color(sunColor));
    p.noStroke();
    const sunX = timeOfDay === "night" ? p.width * 0.3 : p.width * 0.8;
    const sunY = p.height * 0.2;
    p.ellipse(sunX, sunY, sunSize, sunSize);

    // The hill's color reflects the user's weekly progress.
    // Green for positive progress, yellow-brown for negative.
    const hillHue = isNegative ? 45 : 120;
    const hillSat = isNegative ? 70 : 50;
    const hillBright = isNegative ? 70 : 65;

    p.fill(hillHue, hillSat, hillBright);
    p.noStroke();

    // Draw the hill as a single shape for a smooth appearance.
    p.beginShape();
    p.vertex(0, p.height);
    for (let i = 0; i < this.hillPoints.length; i++) {
      p.vertex(i * 10, this.hillPoints[i]);
    }
    p.vertex(p.width, p.height);
    p.endShape(this.p.CLOSE);

    p.pop();
  }
}
