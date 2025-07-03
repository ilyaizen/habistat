<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { triggerFireworks } from "$lib/stores/ui";

  // Svelte 5 $state and $effect runes
  let isTriggered = $state(false);
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let maxx = 0;
  let maxy = 0;
  let fireworks: Firework[] = [];
  let explosions: Particle[] = [];
  let animationFrameId: number | null = null;
  let launchTimerId: number | null = null;
  let triggerTimeoutId: number | null = null;
  let isStopping = $state(false); // New state to manage graceful shutdown

  // Derived store to react to changes in the triggerFireworks store
  $effect(() => {
    const triggerValue = $triggerFireworks;
    if (triggerValue && !isTriggered) {
      let intensity = 1; // Default intensity
      if (typeof triggerValue === "number") {
        // Scale down points, with a minimum intensity, so even 1 point has an effect.
        intensity = Math.max(0.2, triggerValue / 5);
      } else if (triggerValue !== true) {
        return; // Do nothing for `false` or other non-truthy values
      }

      startFireworks(intensity);

      // Reset the store after triggering
      triggerFireworks.set(false);
    }
  });

  // Utility functions for randomness
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
  const randColor = () => `hsl(${randInt(0, 360)}, 100%, 50%)`;

  // Particle class representing individual explosion particles
  class Particle {
    x: number;
    y: number;
    color: string;
    speed: number;
    direction: number;
    vx: number;
    vy: number;
    gravity: number;
    friction: number;
    alpha: number;
    decay: number;
    size: number;

    constructor(
      x: number,
      y: number,
      color: string,
      speed: number,
      direction: number,
      gravity: number,
      friction: number,
      size: number
    ) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.speed = speed;
      this.direction = direction;
      this.vx = Math.cos(direction) * speed;
      this.vy = Math.sin(direction) * speed;
      this.gravity = gravity;
      this.friction = friction;
      this.alpha = 1;
      this.decay = rand(0.005, 0.02); // Randomized decay for smoother fading
      this.size = size;
    }

    // Update particle properties
    update() {
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    }

    // Draw the particle on the canvas
    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }

    // Check if the particle is still visible
    isAlive() {
      return this.alpha > 0;
    }
  }

  // Firework class representing ascending fireworks
  class Firework {
    x: number;
    y: number;
    targetY: number;
    color: string;
    speed: number;
    size: number;
    angle: number;
    vx: number;
    vy: number;
    trail: { x: number; y: number }[];
    trailLength: number;
    exploded: boolean;
    intensity: number;

    constructor(
      x: number,
      y: number,
      targetY: number,
      color: string,
      speed: number,
      size: number,
      intensity: number = 1
    ) {
      this.x = x;
      this.y = y;
      this.targetY = targetY;
      this.color = color;
      this.speed = speed;
      this.size = size;
      this.angle = -Math.PI / 2 + rand(-0.3, 0.3); // Increased variation in ascent angle
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.trail = [];
      this.trailLength = randInt(10, 25); // Increased trail length for smoother ascent
      this.exploded = false;
      this.intensity = intensity;
    }

    // Update firework position
    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.trailLength) {
        this.trail.shift();
      }

      this.x += this.vx;
      this.y += this.vy;

      // Apply gravity (slightly slowing ascent)
      this.vy += 0.02;

      // Check if the firework has reached its target height or its vertical speed has reduced
      if (this.vy >= 0 || this.y <= this.targetY) {
        this.explode();
        return false; // Firework has exploded
      }
      return true; // Firework is still ascending
    }

    // Create explosion particles
    explode() {
      // Scale number of particles with intensity
      const numParticles = randInt(50, 150) * this.intensity;
      for (let i = 0; i < numParticles; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(2, 7); // Wider speed range for dynamic splatter
        const particleSize = rand(1, 5); // Wider size range for varied splatter
        explosions.push(
          new Particle(
            this.x,
            this.y,
            this.color,
            speed,
            angle,
            0.05, // gravity
            0.98, // friction
            particleSize
          )
        );
      }
    }

    // Draw the firework trail
    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.beginPath();
      if (this.trail.length > 1) {
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let point of this.trail) {
          ctx.lineTo(point.x, point.y);
        }
      } else {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y);
      }
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }
  }

  // Initialize canvas and start animation
  onMount(() => {
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set initial canvas size
    resizeCanvas();

    // Add window resize listener
    window.addEventListener("resize", resizeCanvas);

    // Clean up on component destroy
    return () => {
      cleanup();
    };
  });

  onDestroy(() => {
    cleanup();
  });

  // Start the fireworks animation
  function startFireworks(intensity: number = 1) {
    if (isTriggered) return; // Prevent multiple triggers

    isTriggered = true;
    isStopping = false; // Reset stopping state
    fireworks = []; // Clear any existing fireworks
    explosions = []; // Clear any existing explosions
    launchFirework(intensity); // Launch the first firework
    animate(); // Start the animation loop

    // Schedule the start of the shutdown process. Duration scales with intensity.
    const duration = 3000 + 2000 * Math.log1p(intensity);
    triggerTimeoutId = window.setTimeout(() => {
      stopFireworks();
    }, duration);
  }

  // Signal the fireworks to stop launching, allowing existing ones to fade out
  function stopFireworks() {
    isStopping = true; // Signal that no new fireworks should be launched
    if (triggerTimeoutId !== null) {
      clearTimeout(triggerTimeoutId);
      triggerTimeoutId = null;
    }
  }

  // Handle window resizing
  function resizeCanvas() {
    if (canvas) {
      maxx = window.innerWidth;
      maxy = window.innerHeight;
      canvas.width = maxx;
      canvas.height = maxy;
      // Redraw static elements if any, here we just clear on resize
      if (ctx) {
        ctx.clearRect(0, 0, maxx, maxy);
      }
    }
  }

  // Launch a new firework at random intervals (only when triggered)
  function launchFirework(intensity: number = 1) {
    if (isStopping) return; // Don't launch new fireworks if stopping

    const x = rand(maxx * 0.1, maxx * 0.9); // Vary horizontal launch position
    const y = maxy; // Start from the bottom of the screen
    const targetY = rand(maxy * 0.1, maxy * 0.4); // Vary target height
    const color = randColor(); // Vibrant random colors
    const speed = rand(4, 8); // Vary ascent speeds
    const size = rand(2, 5); // Vary firework sizes
    fireworks.push(new Firework(x, y, targetY, color, speed, size, intensity));

    // Schedule next firework launch. Faster launches with more intensity.
    const timeout = rand(300, 800) / Math.sqrt(intensity); // milliseconds
    launchTimerId = window.setTimeout(() => launchFirework(intensity), timeout);
  }

  // Animation loop
  function animate() {
    if (!ctx || !canvas) return;

    // Clear the canvas on each frame for a transparent background
    ctx.clearRect(0, 0, maxx, maxy);

    // Update and draw fireworks
    fireworks = fireworks.filter((f) => f.update());
    fireworks.forEach((f) => f.draw(ctx!));

    // Update and draw explosions
    explosions = explosions.filter((p) => {
      p.update();
      p.draw(ctx!);
      return p.isAlive();
    });

    // Request next animation frame if there's still something to animate
    if (fireworks.length > 0 || explosions.length > 0) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      // Animation is done, clean up
      animationFrameId = null;
      isTriggered = false; // Reset the trigger state, which hides the canvas
      isStopping = false; // Reset for next time
    }
  }

  // Cleanup function
  function cleanup() {
    // Ensure animation and timers are stopped during cleanup
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (launchTimerId !== null) {
      clearTimeout(launchTimerId);
      launchTimerId = null;
    }
    if (triggerTimeoutId !== null) {
      clearTimeout(triggerTimeoutId);
      triggerTimeoutId = null;
    }
    window.removeEventListener("resize", resizeCanvas);
    // Clear canvas on cleanup
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Optional: Launch fireworks on click (can be removed or adapted)
  // Kept for testing, but the main trigger will be the store
  function handleClick(event: MouseEvent) {
    if (!isTriggered) startFireworks(); // Start if not already running on click
    // You might want to add logic here to launch one firework at the click position if desired
  }
</script>

<!--
  The wrapper div is fixed to the viewport and uses pointer-events-none to
  allow clicks to pass through to the underlying UI.
  The 'hidden' attribute is used to control visibility, which is more
  efficient and avoids issues with CSS opacity transitions.
-->
<div class="pointer-events-none fixed inset-0 z-[9999]" hidden={!isTriggered}>
  <canvas bind:this={canvas} class="pointer-events-none h-full w-full" aria-hidden="true"></canvas>
</div>
