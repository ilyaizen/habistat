<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { get, type Readable } from "svelte/store";
  import { setGroupContext } from "./group.js";

  let { children } = $props();

  type FlowInstance = {
    willUpdate: () => void;
    didUpdate: () => void;
    created: boolean;
  };

  // Use SvelteSet for better reactivity
  const flows = new SvelteSet<Readable<FlowInstance>>();
  let updating = false;

  const registerWithGroup = (el: Readable<FlowInstance>) => {
    flows.add(el);

    $effect(() => {
      if (updating) return;

      // Use tick() to handle async operations
      tick().then(() => {
        updating = true;
        for (const flow of flows) {
          const f = get(flow);
          if (f?.created) {
            f.willUpdate();
            tick().then(() => {
              get(flow)?.didUpdate();
            });
          }
        }
        tick().then(() => {
          updating = false;
        });
      });
    });

    onDestroy(() => {
      flows.delete(el);
    });
  };

  setGroupContext({ register: registerWithGroup });
</script>

{@render children()}
