<script lang="ts">
  import { get, type Readable } from "svelte/store";
  import { onDestroy, tick } from "svelte";
  import { setGroupContext } from "./group.js";

  let { children } = $props();

  type FlowInstance = {
    willUpdate: () => void;
    didUpdate: () => void;
    created: boolean;
  };

  const flows = new Set<Readable<FlowInstance>>();
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
          if (f && f.created) {
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
