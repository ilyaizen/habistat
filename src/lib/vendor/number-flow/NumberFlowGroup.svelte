<script>
  import { get } from "svelte/store";
  import { onDestroy, tick } from "svelte";
  import { setGroupContext } from "./group.js"; // This file will need to be created as well.

  const flows = new Set();
  let updating = false;

  const registerWithGroup = (el) => {
    flows.add(el);

    $effect(async () => {
      if (updating) return;
      updating = true;
      for (const flow of flows) {
        const f = get(flow);
        if (f && f.created) {
          f.willUpdate();
          await tick();
          get(flow)?.didUpdate();
        }
      }
      await tick();
      updating = false;
    });

    onDestroy(() => {
      flows.delete(el);
    });
  };

  setGroupContext({ register: registerWithGroup });
</script>

<slot />
