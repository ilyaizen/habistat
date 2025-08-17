<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { settings } from "$lib/stores/settings";
  import { triggerDamage, type DamageTrigger } from "$lib/stores/ui";

  // Local state controlling visibility and computed overlay center
  let isActive = $state(false);
  let overlayEl = $state<HTMLDivElement | null>(null);
  // Overlay center in pixels; null means compute from viewport center on activation
  let overlayCenterX = $state<number | null>(null);
  let overlayCenterY = $state<number | null>(null);
  // Overlay flash duration in ms; scaled per-intensity
  let overlayFlashMs = $state(500);
  let cleanupTimerId: number | null = null;
  // Element that receives shake/desaturation (app content wrapper)
  let shakeRootEl: HTMLElement | null = null;

  // Helper: clamp values to a range
  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  // Compute and apply the effect based on store payload
  function activateDamageEffect(payload: true | number | DamageTrigger) {
    // Avoid overlapping effects; restart is allowed by first clearing state
    clearTimersAndClasses();

    const motionEnabled = $settings.enableMotion;

    // Normalize payload into intensity and origin
    let intensity = 1;
    let originX: number | null = null;
    let originY: number | null = null;

    if (payload === true) {
      intensity = 1;
    } else if (typeof payload === "number") {
      intensity = payload;
    } else if (typeof payload === "object" && payload) {
      intensity = payload.intensity ?? 1;
      originX = payload.originX ?? null;
      originY = payload.originY ?? null;
    }

    intensity = clamp(intensity, 0.2, 2);

    // Set overlay center if provided; else center of viewport (in pixels)
    if (typeof originX === "number" && typeof originY === "number") {
      overlayCenterX = originX;
      overlayCenterY = originY;
    } else {
      try {
        overlayCenterX = Math.floor(window.innerWidth / 2);
        overlayCenterY = Math.floor(window.innerHeight / 2);
      } catch {
        overlayCenterX = 0;
        overlayCenterY = 0;
      }
    }

    // Activate overlay
    isActive = true;

    // Apply desaturation and shake to the app content wrapper
    try {
      shakeRootEl = document.getElementById("hb-shake-root");
      if (!shakeRootEl) {
        // Fallback if the wrapper is not present for any reason
        shakeRootEl = document.body;
      }
      shakeRootEl.classList.add("hb-damage-desaturated");
      if (motionEnabled) {
        shakeRootEl.classList.add("hb-damage-shaking");
      }
      // Prevent horizontal scrollbars during shake and set single amplitude variable
      document.documentElement.classList.add("hb-no-x-overflow");
      document.body.classList.add("hb-no-x-overflow");
      const root = document.documentElement;
      const amplitudePx = Math.max(6, Math.round(18 * intensity));
      root.style.setProperty("--hb-shake", `${amplitudePx}px`);
    } catch {}

    // Flash and duration scale mildly with intensity; shorter if motion disabled
    overlayFlashMs = Math.round(500 * intensity);
    const baseMs = motionEnabled ? 1200 : 600;
    const durationMs = Math.round(baseMs * intensity);

    // Schedule cleanup
    cleanupTimerId = window.setTimeout(() => {
      isActive = false;
      try {
        const target = shakeRootEl || document.body;
        target.classList.remove("hb-damage-desaturated", "hb-damage-shaking");
        document.documentElement.classList.remove("hb-no-x-overflow");
        document.body.classList.remove("hb-no-x-overflow");
        document.documentElement.style.removeProperty("--hb-shake");
      } catch {}
      shakeRootEl = null;
      cleanupTimerId = null;
    }, durationMs);
  }

  function clearTimersAndClasses() {
    if (cleanupTimerId !== null) {
      clearTimeout(cleanupTimerId);
      cleanupTimerId = null;
    }
    try {
      const target = shakeRootEl || document.body;
      target.classList.remove("hb-damage-desaturated", "hb-damage-shaking");
      document.documentElement.classList.remove("hb-no-x-overflow");
      document.body.classList.remove("hb-no-x-overflow");
      document.documentElement.style.removeProperty("--hb-shake");
    } catch {}
    shakeRootEl = null;
  }

  // React to the damage trigger store
  $effect(() => {
    const val = $triggerDamage;
    if (!val) return;

    // Respect motion preference: we still show a quick overlay/desaturation but no shake
    activateDamageEffect(val);
    // Reset trigger to allow subsequent activations
    triggerDamage.set(false);
  });

  onMount(() => {
    return () => {
      clearTimersAndClasses();
    };
  });

  onDestroy(() => {
    clearTimersAndClasses();
  });
</script>

<!--
  Full-viewport overlay.
  The overlay is fixed and non-interactive (pointer-events-none), rendered at a very high z-index.
  We keep it lightweight and Tailwind-first for sizing/position/opacity transitions and use a
  simple radial gradient that is transparent in the center and red only at the extreme edges.
-->
{#if isActive}
  <div
    bind:this={overlayEl}
    class="hb-damage-overlay pointer-events-none fixed top-0 left-0 z-[9999] opacity-100"
    style={`
      width: 100vw;
      height: 100vh;
      animation: hb-damage-fade ${overlayFlashMs}ms ease-out both;
      background: radial-gradient(
        circle farthest-corner at 50% 50%,
        rgba(255, 0, 0, 0) 0%,
        rgba(255, 0, 0, 0.05) 88%,
        rgba(255, 0, 0, 0.3) 94%,
        rgba(255, 0, 0, 0.5) 100%
      );
    `}
    aria-hidden="true"
  ></div>
{/if}

<style>
  /* Desaturate and add a red tint to the entire page content smoothly */
  :global(.hb-damage-desaturated) {
    transition: filter 300ms ease;
    filter: saturate(0.4);
  }

  /* Stronger DOOM-like shake with more vertical and horizontal movement */
  @keyframes hb-doom-shake {
    0% {
      transform: translate3d(0, 0, 0);
    }
    10% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * -0.8),
        calc(var(--hb-shake, 10px) * 0.3),
        0
      );
    }
    20% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * 0.9),
        calc(var(--hb-shake, 10px) * -0.4),
        0
      );
    }
    30% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * -0.7),
        calc(var(--hb-shake, 10px) * 0.5),
        0
      );
    }
    40% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * 0.6),
        calc(var(--hb-shake, 10px) * -0.2),
        0
      );
    }
    50% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * -0.5),
        calc(var(--hb-shake, 10px) * 0.4),
        0
      );
    }
    60% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * 0.4),
        calc(var(--hb-shake, 10px) * -0.3),
        0
      );
    }
    70% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * -0.3),
        calc(var(--hb-shake, 10px) * 0.2),
        0
      );
    }
    80% {
      transform: translate3d(
        calc(var(--hb-shake, 10px) * 0.2),
        calc(var(--hb-shake, 10px) * -0.1),
        0
      );
    }
    90% {
      transform: translate3d(calc(var(--hb-shake, 10px) * -0.1), 0, 0);
    }
    100% {
      transform: translate3d(0, 0, 0);
    }
  }

  :global(.hb-damage-shaking) {
    animation: hb-doom-shake 0.9s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    perspective: 1000px;
  }

  /* Simple fade-out for the overlay with a stronger start */
  @keyframes hb-damage-fade {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .hb-damage-overlay {
    will-change: opacity, transform;
  }

  /* Disable horizontal scrollbars during shake */
  :global(html.hb-no-x-overflow),
  :global(body.hb-no-x-overflow) {
    overflow-x: hidden;
  }
</style>
