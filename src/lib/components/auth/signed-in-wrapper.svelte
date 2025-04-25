<script lang="ts">
  // A simpler wrapper around the SignedIn component
  import { SignedIn } from "svelte-clerk";
  import { claimSession } from "$lib/stores/session";

  // Define children prop using Svelte 5 syntax
  const { children } = $props<{
    children: () => unknown;
  }>();

  // Reactively mark session as claimed when Clerk user state becomes available
  $effect(() => {
    claimSession();
  });
</script>

<!-- Simple wrapper around SignedIn component -->
<SignedIn>
  {@render children()}
</SignedIn>
