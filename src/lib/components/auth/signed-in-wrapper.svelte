<script lang="ts">
  // A simpler wrapper around the SignedIn component
  import { SignedIn } from "svelte-clerk";
  import { onMount } from "svelte";
  import { markSessionClaimed } from "$lib/utils/tracking";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  // Define children prop using Svelte 5 syntax
  const { children } = $props<{
    children: () => unknown;
  }>();

  // When user is signed in, mark session as claimed
  onMount(() => {
    if (browser && window.Clerk?.user) {
      // Mark session as claimed
      markSessionClaimed();

      // Clean the URL of any Clerk parameters after successful sign-in
      if (window.location.search.includes("__clerk") || window.location.hash.includes("__clerk")) {
        // Create clean URL by removing clerk parameters
        const url = new URL(window.location.href);
        url.searchParams.delete("__clerk_handshake");
        url.searchParams.delete("__clerk_status");
        url.searchParams.delete("__clerk_created_session");

        // Clean hash if it contains Clerk parameters
        if (url.hash && url.hash.includes("__clerk")) {
          url.hash = "";
        }

        // Only keep path + any non-Clerk query params + hash
        const cleanPath = url.pathname + (url.search !== "?" ? url.search : "") + url.hash;

        // Use goto to navigate to clean URL
        setTimeout(() => {
          goto(cleanPath, { replaceState: true });
        }, 100);

        console.log("Redirecting to clean URL:", cleanPath);
      } else {
        console.log("User signed in, session claimed");
      }
    }
  });
</script>

<!-- Simple wrapper around SignedIn component -->
<SignedIn>
  {@render children?.()}
</SignedIn>
