<!-- claim-session.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { isAnonymous } from "$lib/utils/tracking";
  import { useClerkContext } from "svelte-clerk/client";

  const ctx = useClerkContext();

  export let onInitiateAuth: () => void;
</script>

{#if isAnonymous()}
  <div class="claim-session">
    <p class="text-muted-foreground mb-2 text-sm">
      You're currently using Habistat anonymously. Sign in to sync your data across devices.
    </p>
    <Button variant="default" onclick={onInitiateAuth}>Claim Your Session</Button>
  </div>
{/if}

<style>
  .claim-session {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
  }
</style>
