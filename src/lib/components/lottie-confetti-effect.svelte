<!-- Renamed from intro-confetti.svelte -->
<script lang="ts">
  import { DotLottie } from "@lottiefiles/dotlottie-web";
  import { browser } from "$app/environment";
  import { settings } from "$lib/stores/settings";
  import { triggerIntroConfetti } from "$lib/stores/ui";

  // Local state
  let visible = $state(false);
  let playing = $state(false);
  let speed = $state(1.5);
  let allowSkip = $state(true);
  let src = $state<string>("/colorful_confetti.json");

  let dotRef: DotLottie | null = null; // underlying player ref
  let canvasEl = $state<HTMLCanvasElement | null>(null);

  function hide() {
    visible = false;
    playing = false;
    if ($triggerIntroConfetti) triggerIntroConfetti.set(false);
    try {
      (dotRef as any)?.stop?.();
      (dotRef as any)?.destroy?.();
      (dotRef as any)?.dispose?.();
    } catch {}
    dotRef = null;
  }

  function initPlayer() {
    if (!browser || !canvasEl) return;
    if (dotRef) {
      try {
        (dotRef as any).destroy?.();
        (dotRef as any).dispose?.();
        (dotRef as any).stop?.();
      } catch {}
      dotRef = null;
    }
    dotRef = new DotLottie({
      canvas: canvasEl,
      src,
      autoplay: true,
      loop: false,
      speed,
      backgroundColor: "#00000000"
    });
    dotRef.addEventListener("complete", () => hide());
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!allowSkip) return;
    if (e.key === "Escape") hide();
  }
  function handleClick() {
    if (!allowSkip) return;
    hide();
  }

  // React to trigger changes
  $effect(() => {
    const trig = $triggerIntroConfetti;

    if (!$settings.enableMotion || !browser) {
      if (trig) triggerIntroConfetti.set(false);
      return;
    }

    if (!trig) return;

    if (typeof trig === "object") {
      speed = trig.speed ?? 1.5;
      allowSkip = trig.allowSkip ?? true;
      src = trig.src ?? "/colorful_confetti.json";
    } else {
      speed = 1.5;
      allowSkip = true;
      src = "/colorful_confetti.json";
    }

    visible = true;
    playing = true;
    queueMicrotask(() => initPlayer());
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
  <div
    class="fixed inset-0 z-[200] select-none"
    role="presentation"
    aria-label="Intro celebration"
    onclick={handleClick}
  >
    <canvas bind:this={canvasEl} class="block h-full w-full"></canvas>
    {#if allowSkip}
      <div
        class="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70"
      >
        Press Esc or click to skip
      </div>
    {/if}
  </div>
{/if}

<style></style>
