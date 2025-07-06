<script lang="ts">
  import { triggerConfetti } from "$lib/stores/ui";

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

  function generateColorVariants(baseColor: string): string[] {
    const variants = [baseColor];
    const hex = baseColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    const lighten = (val: number, amount: number) => Math.min(255, Math.floor(val + amount));
    const darken = (val: number, amount: number) => Math.max(0, Math.floor(val - amount));

    variants.push(`rgb(${lighten(r, 60)}, ${lighten(g, 60)}, ${lighten(b, 60)})`);
    variants.push(`rgb(${lighten(r, 30)}, ${lighten(g, 30)}, ${lighten(b, 30)})`);
    variants.push(`rgb(${darken(r, 30)}, ${darken(g, 30)}, ${darken(b, 30)})`);
    variants.push(
      `rgb(${Math.min(255, r + 80)}, ${Math.max(0, g - 20)}, ${Math.min(255, b + 80)})`
    );
    variants.push(
      `rgb(${Math.max(0, r - 20)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)})`
    );
    variants.push(
      `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.max(0, b - 20)})`
    );
    variants.push("#FFD700", "#FFA500", "#FFFF00");

    return variants;
  }

  $effect(() => {
    const triggerValue = $triggerConfetti;
    if (triggerValue) {
      let color = "#3b82f6";
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
        amount: Math.floor(70 * intensity),
        duration: 3000,
        fallDistance: "200px",
        cone: true,
        x: [-0.7, 0.7],
        y: [0.5, 1.2],
        size: 12,
        delay: [0, 100],
        xSpread: 0.2,
        rounded: true
      };

      bursts = [...bursts, newBurst];

      setTimeout(
        () => {
          bursts = bursts.filter((b) => b.id !== newBurst.id);
        },
        newBurst.duration + Math.max(...newBurst.delay) + 500
      );

      triggerConfetti.set(false);
    }
  });

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
        --transition-iteration-count: 1;
      "
    >
      {#each { length: burst.amount } as _}
        <div
          class="confetti"
          style="
            --color: {burst.colors[Math.floor(Math.random() * burst.colors.length)]};
            --skew: {randomBetween(-45, 45)}deg,{randomBetween(-45, 45)}deg;
            --rotation-xyz: {randomBetween(-10, 10)}, {randomBetween(-10, 10)}, {randomBetween(
            -10,
            10
          )};
            --rotation-deg: {randomBetween(0, 360)}deg;
            --translate-y-multiplier: {randomBetween(burst.y[0], burst.y[1])};
            --translate-x-multiplier: {randomBetween(burst.x[0], burst.x[1])};
            --scale: {0.1 * randomBetween(2, 10)};
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
      transform: skew(var(--skew)) rotate3d(var(--full-rotation));
    }

    100% {
      transform: skew(var(--skew)) rotate3d(var(--rotation-xyz), calc(var(--rotation-deg) + 360deg));
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

  @keyframes no-gravity-translate {
    0% {
      opacity: 1;
    }

    100% {
      transform: translateY(var(--translate-y)) translateX(var(--translate-x));
      opacity: 0;
    }
  }

  .confetti {
    --translate-y: calc(-200px * var(--translate-y-multiplier));
    --translate-x: calc(200px * var(--translate-x-multiplier));
    position: absolute;
    height: calc(var(--size) * var(--scale));
    width: calc(var(--size) * var(--scale));
    animation: translate var(--transition-duration) var(--transition-delay)
      var(--transition-iteration-count) linear;
    opacity: 0;
    pointer-events: none;
  }

  .confetti::before {
    --full-rotation: var(--rotation-xyz), var(--rotation-deg);
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    background: var(--color);
    background-size: contain;
    transform: skew(var(--skew)) rotate3d(var(--full-rotation));
    animation: rotate var(--transition-duration) var(--transition-delay)
      var(--transition-iteration-count) linear;
  }

  .rounded .confetti::before {
    border-radius: 50%;
  }

  .cone .confetti {
    --translate-x: calc(200px * var(--translate-y-multiplier) * var(--translate-x-multiplier));
  }

  /* .no-gravity .confetti {
    animation-name: no-gravity-translate;
    animation-timing-function: ease-out;
  }

  @media (prefers-reduced-motion) {
    .reduced-motion .confetti,
    .reduced-motion .confetti::before {
      animation: none;
    }
  } */
</style>
