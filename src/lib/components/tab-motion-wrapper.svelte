<script lang="ts">
  import { fly } from "svelte/transition";
  import { settings } from "$lib/stores/settings";

  // Props: key (string) to trigger transition, children (slot)
  let { key, children, class: className = "", ...rest } = $props();

  // Custom easing function for smooth transitions (same as motion-wrapper)
  const customEase = (t: number) => {
    const p1 = { x: 0, y: 0.7 };
    const p2 = { x: 0.1, y: 1 };
    return cubicBezier(t, p1.x, p1.y, p2.x, p2.y);
  };

  // Cubic bezier implementation for custom easing
  function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
    const solveCurveX = (x: number) => {
      let t0 = 0;
      let t1 = 1;
      let t2 = x;
      for (let i = 0; i < 8; i++) {
        const x2 = sampleCurveX(t2);
        if (Math.abs(x2 - x) < 0.001) return t2;
        const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
        if (Math.abs(d2) < 0.000001) break;
        t2 = t2 - (x2 - x) / d2;
      }
      if (t2 < t0) return t0;
      if (t2 > t1) return t1;
      return t2;
    };
    return sampleCurveY(solveCurveX(t));
  }
</script>

<!--
  TabMotionWrapper animates its children when the 'key' prop changes.
  Used for smooth transitions between tab contents.
-->
{#key key}
  <div
    in:fly={{ y: 30, duration: $settings.enableMotion ? 350 : 0, easing: customEase }}
    class="h-full overflow-clip {className}"
    {...rest}
  >
    {@render children()}
  </div>
{/key}
