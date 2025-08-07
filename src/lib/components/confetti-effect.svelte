<script lang="ts">
  import { triggerConfetti } from "$lib/stores/ui";
  import { colorNameToCss } from "$lib/utils/colors";

  interface ConfettiBurst {
    id: number;
    originX: number;
    originY: number;
    colors: string[];
    amount: number;
    duration: number;
    fallDistance: string;
    cone: boolean;
    x: [number, number];
    y: [number, number];
    size: number;
    delay: [number, number];
    xSpread: number;
    rounded: boolean;
  }

  let bursts = $state<ConfettiBurst[]>([]);
  let nextId = 0;

  /**
   * Generates color variants from a base color to create visual variety in the confetti.
   * Creates lighter, darker, and complementary color variations.
   */
  function generateColorVariants(baseColor: string): string[] {
    // Accept any CSS color string (OKLCH, rgb, etc.).
    // Generate visually distinct mixes using OKLab space.
    const base = baseColor && baseColor.trim() !== "" ? baseColor : colorNameToCss("indigo");
    return [
      base,
      `color-mix(in oklab, ${base}, white 35%)`,
      `color-mix(in oklab, ${base}, white 20%)`,
      `color-mix(in oklab, ${base}, black 8%)`,
      `color-mix(in oklab, ${base}, black 16%)`
    ];
  }

  /**
   * Effect that listens for confetti trigger events and creates new confetti bursts.
   * Handles different trigger types: boolean, number, or ConfettiTrigger object.
   */
  $effect(() => {
    const triggerValue = $triggerConfetti;
    if (triggerValue) {
      let color = colorNameToCss("indigo");
      let intensity = 1;
      let originX = window.innerWidth / 2;
      let originY = window.innerHeight / 2;

      if (typeof triggerValue === "object") {
        color = triggerValue.color || color;
        intensity = Math.max(0.5, (triggerValue.points || 1) / 3);
        if (triggerValue.originX !== undefined && triggerValue.originY !== undefined) {
          originX = triggerValue.originX;
          originY = triggerValue.originY;
        }
      } else if (typeof triggerValue === "number") {
        intensity = Math.max(0.5, triggerValue / 3);
      }

      const newBurst: ConfettiBurst = {
        id: nextId++,
        originX,
        originY,
        colors: generateColorVariants(color),
        amount: Math.floor(25 * intensity),
        duration: 3000,
        fallDistance: "200px",
        cone: true,
        x: [-0.5, 0.5],
        y: [0.2, 1.2],
        size: 5,
        delay: [0, 500],
        xSpread: 0.1,
        rounded: true
      };

      bursts = [...bursts, newBurst];

      // Clean up the burst after animation completes
      setTimeout(
        () => {
          bursts = bursts.filter((b) => b.id !== newBurst.id);
        },
        newBurst.duration + Math.max(...newBurst.delay) + 500
      );

      // Reset the trigger
      triggerConfetti.set(false);
    }
  });

  /**
   * Generates a random number between min and max values.
   * Used for creating varied confetti properties like rotation, scale, and position.
   */
  function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }
</script>

<div class="confetti-viewport">
  {#each bursts as burst (burst.id)}
    <div
      class="confetti-holder"
      class:rounded={burst.rounded}
      class:cone={burst.cone}
      style="
        left: {burst.originX}px;
        top: {burst.originY}px;
        --fall-distance: {burst.fallDistance};
        --size: {burst.size}px;
        --x-spread: {1 - burst.xSpread};
      "
    >
      {#each { length: burst.amount }}
        <div
          class="confetti"
          style="
            --color: {burst.colors[Math.floor(Math.random() * burst.colors.length)]};
            --skew: {randomBetween(-45, 45)}deg,{randomBetween(-45, 45)}deg;
            --rotation-x: {randomBetween(-30, 30)};
            --rotation-y: {randomBetween(-30, 30)};
            --rotation-z: {randomBetween(-30, 30)};
            --rotation-deg: {randomBetween(0, 360)}deg;
            --translate-y-multiplier: {randomBetween(burst.y[0], burst.y[1])};
            --translate-x-multiplier: {randomBetween(burst.x[0], burst.x[1])};
            --scale: {0.1 * randomBetween(4, 16)};
            --transition-delay: {randomBetween(burst.delay[0], burst.delay[1])}ms;
            --transition-duration: {burst.duration}ms;
          "
        ></div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .confetti-viewport {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
  }

  .confetti-holder {
    position: absolute;
  }

  @keyframes rotate {
    0% {
      transform: skew(var(--skew))
        rotate3d(var(--rotation-x), var(--rotation-y), var(--rotation-z), var(--rotation-deg));
    }

    100% {
      transform: skew(var(--skew))
        rotate3d(
          var(--rotation-x),
          var(--rotation-y),
          var(--rotation-z),
          calc(var(--rotation-deg) + 360deg)
        );
    }
  }

  @keyframes translate {
    0% {
      opacity: 1;
      transform: translateY(0) translateX(0);
    }

    8% {
      transform: translateY(calc(var(--translate-y) * 0.95))
        translateX(calc(var(--translate-x) * (var(--x-spread) * 0.9)));
      opacity: 1;
    }

    12% {
      transform: translateY(var(--translate-y))
        translateX(calc(var(--translate-x) * (var(--x-spread) * 0.95)));
      opacity: 1;
    }

    16% {
      transform: translateY(var(--translate-y))
        translateX(calc(var(--translate-x) * var(--x-spread)));
      opacity: 1;
    }

    100% {
      transform: translateY(calc(var(--translate-y) + var(--fall-distance)))
        translateX(var(--translate-x));
      opacity: 0;
    }
  }

  .confetti {
    --translate-y: calc(-200px * var(--translate-y-multiplier));
    --translate-x: calc(200px * var(--translate-x-multiplier));
    position: absolute;
    height: calc(var(--size) * var(--scale));
    width: calc(var(--size) * var(--scale));
    animation: translate var(--transition-duration) var(--transition-delay) ease-out forwards;
    opacity: 0;
    pointer-events: none;
  }

  .confetti::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    background: var(--color);
    background-size: contain;
    transform: skew(var(--skew))
      rotate3d(var(--rotation-x), var(--rotation-y), var(--rotation-z), var(--rotation-deg));
    animation: rotate var(--transition-duration) var(--transition-delay) linear;
  }

  .rounded .confetti::before {
    border-radius: 50%;
  }

  .cone .confetti {
    --translate-x: calc(200px * var(--translate-y-multiplier) * var(--translate-x-multiplier));
  }

  /* Respect user's motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .confetti,
    .confetti::before {
      animation: none;
    }
  }
</style>
