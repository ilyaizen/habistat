<script lang="ts">
  // A simpler wrapper around the SignedIn component
  import { SignedIn } from "svelte-clerk";
  import { onMount } from "svelte";
  import { markSessionClaimed, isSessionClaimed } from "$lib/utils/tracking";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  // Define children prop using Svelte 5 syntax
  const { children } = $props<{
    children: () => unknown;
  }>();

  // When user is signed in, mark session as claimed
  onMount(() => {
    if (browser) {
      // Check if Clerk is loaded and user exists
      const checkClerkStatus = () => {
        if (window.Clerk?.user) {
          // Only mark as claimed if not already claimed
          if (!isSessionClaimed()) {
            markSessionClaimed();
            console.log("User is authenticated, session marked as claimed");
          }

          // Clean the URL of any Clerk parameters after successful sign-in
          if (
            window.location.search.includes("__clerk") ||
            window.location.hash.includes("__clerk")
          ) {
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
            goto(cleanPath, { replaceState: true });
            console.log("Redirected to clean URL:", cleanPath);
          }
        }
      };

      // Try immediately in case Clerk is already loaded
      checkClerkStatus();

      // Also set up a MutationObserver to detect when Clerk loads and updates the DOM
      // This helps catch when Clerk lazy-loads after the component is mounted
      const observer = new MutationObserver((mutations) => {
        if (window.Clerk?.user) {
          checkClerkStatus();
          observer.disconnect(); // Stop observing once Clerk is detected
        }
      });

      // Start observing document for Clerk-related changes
      observer.observe(document.body, { childList: true, subtree: true });

      // Clean up observer on component destruction
      return () => {
        observer.disconnect();
      };
    }
  });
</script>

<!-- Simple wrapper around SignedIn component -->
<SignedIn>
  {@render children?.()}
</SignedIn>
