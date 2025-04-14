<!-- clerk-wrapper.svelte -->
<script lang="ts">
  import { SignedIn, SignedOut, SignInButton } from "svelte-clerk";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { type Snippet } from "svelte";

  const {
    initiateAuth,
    children,
    anonymous
  }: {
    initiateAuth: () => void;
    children: Snippet;
    anonymous: Snippet<[{ initiateAuth: () => void }]>;
  } = $props();
  let isOnline = $state(true);

  onMount(() => {
    if (browser) {
      // Check initial online status
      isOnline = navigator.onLine;

      // Add event listeners for online/offline status
      window.addEventListener("online", () => (isOnline = true));
      window.addEventListener("offline", () => (isOnline = false));

      return () => {
        window.removeEventListener("online", () => (isOnline = true));
        window.removeEventListener("offline", () => (isOnline = false));
      };
    }
  });

  // Only show sign in on sign-in page or when explicitly requested
  const showSignIn = $derived($page.url.pathname === "/sign-in");
</script>

{#if browser}
  <SignedIn>
    <div>
      {@render children?.()}
    </div>
  </SignedIn>

  <SignedOut>
    {#if showSignIn}
      {#if !isOnline}
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-destructive">You are currently offline. Some features may be limited.</p>
        </div>
      {:else}
        <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <h2 class="text-xl font-semibold">Sign in to sync your data</h2>
          <SignInButton mode="modal">
            <button
              class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      {/if}
    {:else}
      <div>
        {@render anonymous?.({ initiateAuth })}
      </div>
    {/if}
  </SignedOut>
{:else}
  <div>
    {@render anonymous?.({ initiateAuth })}
  </div>
{/if}

<style>
</style>
