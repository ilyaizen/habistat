<script lang="ts">
  import { onMount } from "svelte";
  import { triggerConfetti } from "$lib/stores/ui";

  // Interface for a single confetti particle
  interface ConfettiParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
    gravity: number;
    shape: "circle" | "square" | "star" | "triangle";
    scale: number;
    scaleSpeed: number;
  }

  // State for confetti particles and animation
  let particles = $state<ConfettiParticle[]>([]);
  let animationId: number | null = null;
  let canvasElement: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  // Animation properties
  const GRAVITY = 0.4;
  const FADE_RATE = 0.015;
  const PARTICLE_COUNT = 60;
  const ANIMATION_DURATION = 4000;

  // Listen for confetti triggers from the store
  $effect(() => {
    const triggerValue = $triggerConfetti;
    if (triggerValue && particles.length === 0) {
      let intensity = 1;
      let color = "#3b82f6"; // Default color
      let originX = window.innerWidth / 2; // Default to center
      let originY = window.innerHeight / 2;

      if (typeof triggerValue === "object") {
        // Extract color, intensity, and position from ConfettiTrigger object
        color = triggerValue.color || "#3b82f6";
        intensity = Math.max(0.5, (triggerValue.points || 1) / 3); // Scale intensity based on points

        // Use provided position or default to center
        if (triggerValue.originX !== undefined && triggerValue.originY !== undefined) {
          originX = triggerValue.originX;
          originY = triggerValue.originY;
        }
      } else if (typeof triggerValue === "number") {
        // Use number as intensity with default color and center position
        intensity = Math.max(0.5, triggerValue / 3);
      }

      startConfetti(color, intensity, originX, originY);

      // Reset the store after triggering
      triggerConfetti.set(false);
    }
  });

  /**
   * Starts the confetti animation with specified color, intensity, and origin position
   * @param color - The hex color for the confetti
   * @param intensity - The intensity multiplier (affects particle count and velocity)
   * @param originX - The x coordinate where confetti should originate
   * @param originY - The y coordinate where confetti should originate
   */
  function startConfetti(color: string, intensity: number = 1, originX: number, originY: number) {
    if (!canvasElement || !ctx) return;

    // Clear any existing animation
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    // Create particles with enhanced colors and shapes
    const particleCount = Math.floor(PARTICLE_COUNT * intensity);
    const newParticles: ConfettiParticle[] = [];

    // Create multiple color variants from the base color
    const colors = generateColorVariants(color);
    const shapes: Array<"circle" | "square" | "star" | "triangle"> = [
      "circle",
      "square",
      "star",
      "triangle"
    ];

    for (let i = 0; i < particleCount; i++) {
      // Create a burst pattern around the origin point
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const velocity = (Math.random() * 8 + 6) * intensity;

      newParticles.push({
        x: originX + (Math.random() - 0.5) * 20, // Small random offset from origin
        y: originY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * velocity * 0.7,
        vy: Math.sin(angle) * velocity * 0.7 - (Math.random() * 3 + 2), // Upward bias
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        gravity: GRAVITY * (0.7 + Math.random() * 0.6),
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        scale: 1,
        scaleSpeed: (Math.random() - 0.5) * 0.02
      });
    }

    particles = newParticles;
    animate();

    // Auto-cleanup after animation duration
    setTimeout(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      particles = [];
    }, ANIMATION_DURATION);
  }

  /**
   * Generates color variants from a base color for more vibrant confetti
   * @param baseColor - The base hex color
   * @returns Array of color variants
   */
  function generateColorVariants(baseColor: string): string[] {
    const variants = [baseColor];

    // Parse hex color to RGB
    const hex = baseColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Create lighter and darker variants
    const lighten = (val: number, amount: number) => Math.min(255, Math.floor(val + amount));
    const darken = (val: number, amount: number) => Math.max(0, Math.floor(val - amount));

    // Add brighter variants
    variants.push(`rgb(${lighten(r, 60)}, ${lighten(g, 60)}, ${lighten(b, 60)})`);
    variants.push(`rgb(${lighten(r, 30)}, ${lighten(g, 30)}, ${lighten(b, 30)})`);

    // Add darker variant
    variants.push(`rgb(${darken(r, 30)}, ${darken(g, 30)}, ${darken(b, 30)})`);

    // Add complementary and analogous colors for more vibrant effect
    variants.push(
      `rgb(${Math.min(255, r + 80)}, ${Math.max(0, g - 20)}, ${Math.min(255, b + 80)})`
    );
    variants.push(
      `rgb(${Math.max(0, r - 20)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)})`
    );
    variants.push(
      `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.max(0, b - 20)})`
    );

    // Add some gold/yellow sparkle variants for celebration
    variants.push("#FFD700", "#FFA500", "#FFFF00");

    return variants;
  }

  /**
   * Draws a particle based on its shape
   * @param particle - The particle to draw
   */
  function drawParticle(particle: ConfettiParticle) {
    if (!ctx) return;

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.scale(particle.scale, particle.scale);
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particle.color;

    const size = particle.size;
    const halfSize = size / 2;

    switch (particle.shape) {
      case "circle":
        ctx.beginPath();
        ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "square":
        ctx.fillRect(-halfSize, -halfSize, size, size);
        break;

      case "star":
        drawStar(ctx, 0, 0, halfSize, halfSize * 0.5, 5);
        break;

      case "triangle":
        ctx.beginPath();
        ctx.moveTo(0, -halfSize);
        ctx.lineTo(-halfSize, halfSize);
        ctx.lineTo(halfSize, halfSize);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  /**
   * Draws a star shape
   * @param ctx - Canvas context
   * @param cx - Center x
   * @param cy - Center y
   * @param outerRadius - Outer radius
   * @param innerRadius - Inner radius
   * @param points - Number of points
   */
  function drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerRadius: number,
    innerRadius: number,
    points: number
  ) {
    ctx.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Main animation loop for confetti particles
   */
  function animate() {
    if (!canvasElement || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Update and draw particles
    particles = particles.filter((particle) => {
      // Update physics
      particle.vy += particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;
      particle.opacity -= FADE_RATE;
      particle.scale += particle.scaleSpeed;

      // Add air resistance
      particle.vx *= 0.998;
      particle.vy *= 0.998;

      // Draw particle if still visible
      if (particle.opacity > 0 && particle.y < canvasElement!.height + 100) {
        drawParticle(particle);
        return true; // Keep particle
      }

      return false; // Remove particle
    });

    // Continue animation if particles exist
    if (particles.length > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      animationId = null;
    }
  }

  /**
   * Handles canvas resize to maintain proper dimensions
   */
  function handleResize() {
    if (!canvasElement) return;

    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
  }

  // Setup canvas and event listeners on mount
  onMount(() => {
    if (canvasElement) {
      ctx = canvasElement.getContext("2d");
      handleResize();
    }

    // Listen for window resize
    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener("resize", handleResize);
    };
  });
</script>

<!--
  Enhanced confetti implementation with improved visuals and positioning.
  Features multiple particle shapes, better colors, and origin-based positioning.
-->
<canvas
  bind:this={canvasElement}
  class="pointer-events-none fixed inset-0 z-[9999]"
  style="width: 100vw; height: 100vh;"
></canvas>
