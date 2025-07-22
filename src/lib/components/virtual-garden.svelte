<script lang="ts">
// import { gamification } from "$lib/stores/gamification";
// import type p5 from "p5";
// import { VirtualGardenSketch } from "$lib/p5/virtual-garden";
// import { P5Canvas } from "$lib/components/ui/p5-canvas";
// import { Badge } from "$lib/components/ui/badge";
// import { TrendingUp, TrendingDown, Minus } from "@lucide/svelte";

// let sketchInstance: VirtualGardenSketch | null = null;

// function getTimeOfDay() {
//   const hour = new Date().getHours();
//   if (hour < 6 || hour >= 22) return "night";
//   if ((hour >= 6 && hour < 8) || (hour >= 18 && hour < 22)) return "twilight";
//   return "day";
// }

// const gardenConfig = $derived({
//   plantCount: Math.max(1, Math.min(20, Math.floor($gamification.totalPoints / 100))),
//   baseGrowth: Math.max(0.2, Math.min(1.0, $gamification.totalPoints / 1000)),
//   timeOfDay: getTimeOfDay(),
//   weeklyPointsDelta: $gamification.weeklyPointsDelta
// });

// const healthStatus = $derived(() => {
//   const delta = $gamification.weeklyPointsDelta;
//   if (delta >= 10) {
//     return { label: "Healthy", color: "bg-emerald-500/20 text-emerald-400", icon: TrendingUp };
//   }
//   if (delta >= -10) {
//     return { label: "Stable", color: "bg-amber-500/20 text-amber-400", icon: Minus };
//   }
//   return { label: "Struggling", color: "bg-red-500/20 text-red-400", icon: TrendingDown };
// });

// const sketch = (p: p5, container?: HTMLDivElement) => {
//   sketchInstance = new VirtualGardenSketch(p, gardenConfig);

//   p.setup = () => {
//     if (container) {
//       sketchInstance?.setup(container);
//     }
//   };

//   p.draw = () => {
//     sketchInstance?.draw();
//   };
// };

// $effect(() => {
//   if (sketchInstance) {
//     sketchInstance.updateData(gardenConfig);
//   }
// });
</script>

<div
  class="bg-card mb-8 h-[170px] w-full max-w-[380px] rounded-md border p-2 shadow-xs sm:w-[380px]"
  aria-label="Virtual Garden"
>
  <div
    class="virtual-garden-wrapper bg-card border-border relative w-full overflow-hidden rounded-lg border"
  >
    <div
      class="virtual-garden h-[150px] w-full"
      role="img"
      aria-label="A pixelated virtual garden, with plants that grow based on your habit tracking."
    >
      <!-- {#if $gamification.loading}
        <div class="bg-muted flex h-full w-full items-center justify-center">
          <span class="text-muted-foreground text-sm">Cultivating garden...</span>
        </div>
      {:else}
        <P5Canvas {sketch} class="h-full w-full" />
      {/if} -->
    </div>
    <!-- <div
      class="absolute top-0 left-0 flex w-full flex-wrap items-center gap-2 bg-black/20 p-2 backdrop-blur-sm"
    >
      <Badge variant="secondary" class="gap-1.5 border-0 {healthStatus().color}">
        <sveltecomponent this={healthStatus().icon} class="h-3.5 w-3.5"></sveltecomponent>
        {healthStatus().label}
      </Badge>
    </div> -->
  </div>
</div>

<style>
  .virtual-garden :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
