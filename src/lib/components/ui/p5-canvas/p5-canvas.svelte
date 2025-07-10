<script lang="ts">
  import { browser } from "$app/environment";
  import type p5 from "p5";

  let {
    sketch,
    class: className = ""
  }: {
    sketch: (p: p5, container?: HTMLDivElement) => void;
    class?: string;
  } = $props();

  let containerRef: HTMLDivElement;
  let p5Instance: p5 | null = null;

  $effect(() => {
    if (browser && containerRef && !p5Instance) {
      const init = async () => {
        const p5Module = await import("p5");
        const sketchWrapper = (p: p5) => {
          // Pass the container to the user-provided sketch function
          sketch(p, containerRef);
        };
        p5Instance = new p5Module.default(sketchWrapper, containerRef);
      };
      init();
    }

    return () => {
      p5Instance?.remove();
      p5Instance = null;
    };
  });
</script>

<div bind:this={containerRef} class={className}></div>
