<script lang="ts">
  import { BROWSER } from "esm-env";
  import NumberFlowLite, {
    define,
    formatToData,
    type KeyedNumberPart,
    renderInnerHTML
  } from "number-flow/lite";
  import { writable } from "svelte/store";
  import { getGroupContext } from "./group.js";

  export class NumberFlowElement extends NumberFlowLite {
    set __svelte_batched(batched: boolean) {
      // Set the internal 'batched' property; used to control batched updates in Svelte context
      this.batched = batched;
    }
    // Override the 'data' setter to ensure correct typing for number parts
    set data(
      data:
        | {
            pre: KeyedNumberPart[]; // Array of keyed parts before the integer (e.g., prefix)
            integer: KeyedNumberPart[]; // Array of keyed integer parts
            fraction: KeyedNumberPart[];
            post: KeyedNumberPart[];
            valueAsString: string;
            value: number;
          }
        | undefined
    ) {
      super.data = data;
    }
  }

  Object.keys(NumberFlowElement.defaultProps).forEach((key) => {
    Object.defineProperty(NumberFlowElement.prototype, `__svelte_${key.toLowerCase()}`, {
      set(value) {
        this[key] = value;
      },
      enumerable: true,
      configurable: true
    });
  });

  if (BROWSER) {
    define("number-flow-svelte", NumberFlowElement);
  }

  let {
    locales = undefined,
    format = undefined,
    value,
    prefix = undefined,
    suffix = undefined,
    willChange = false,
    transformTiming = NumberFlowElement.defaultProps.transformTiming,
    spinTiming = NumberFlowElement.defaultProps.spinTiming,
    opacityTiming = NumberFlowElement.defaultProps.opacityTiming,
    animated = NumberFlowElement.defaultProps.animated,
    respectMotionPreference = NumberFlowElement.defaultProps.respectMotionPreference,
    trend = NumberFlowElement.defaultProps.trend,
    plugins = NumberFlowElement.defaultProps.plugins,
    digits = NumberFlowElement.defaultProps.digits,
    el = undefined
  } = $props();

  const elStore = writable(el);
  $effect(() => {
    $elStore = el;
  });

  let formatter = $derived(new Intl.NumberFormat(locales, format));
  let data = $derived(formatToData(value, formatter, prefix, suffix));

  const group = getGroupContext();
  group?.register?.(elStore);
</script>

<number-flow-svelte
  bind:this={el}
  data-will-change={willChange ? "" : undefined}
  onanimationsstart={() => {}}
  onanimationsfinish={() => {}}
  __svelte_batched={Boolean(group)}
  __svelte_transformtiming={transformTiming}
  __svelte_spintiming={spinTiming}
  __svelte_opacitytiming={opacityTiming}
  __svelte_animated={animated}
  __svelte_respectmotionpreference={respectMotionPreference}
  __svelte_trend={trend}
  __svelte_plugins={plugins}
  __svelte_digits={digits}
  {data}
>
  {#if !BROWSER}
    {@html renderInnerHTML(data)}
  {/if}
</number-flow-svelte>
