<!-- clerk-wrapper.svelte -->
<script lang="ts">
  import { SignedIn, SignedOut, SignInButton } from "svelte-clerk";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { type Snippet } from "svelte";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  const {
    initiateAuth,
    children,
    anonymous
  }: {
    initiateAuth: () => void;
    children: Snippet;
    anonymous: Snippet<[{ initiateAuth: () => void }]>;
  } = $props();

  // Get online status from context
  const isOnline = getContext<Writable<boolean>>("isOnline");
  let hasAttemptedSync = $state(false);

  // Only show sign in on sign-in page or when explicitly requested
  const showSignIn = $derived($page.url.pathname === "/sign-in");

  function handleSyncAttempt() {
    if (!$isOnline) {
      console.warn("Cannot sync while offline");
      return;
    }
    hasAttemptedSync = true;
    initiateAuth();
  }
</script>

{#if browser}
  <SignedIn>
    <div>
      {@render children?.()}
    </div>
  </SignedIn>

  <SignedOut>
    {#if showSignIn}
      {#if !$isOnline}
        <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Alert variant="destructive">
            <AlertDescription>
              You are currently offline. Your data will be stored locally and can be synced when
              you're back online.
            </AlertDescription>
          </Alert>
          <p class="text-muted-foreground">Continue using the app in offline mode</p>
        </div>
      {:else if !hasAttemptedSync}
        <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <h2 class="text-xl font-semibold">Sign in to sync your data</h2>
          <SignInButton mode="modal">
            <button
              class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
              onclick={handleSyncAttempt}
            >
              Sign in
            </button>
          </SignInButton>
          <p class="text-muted-foreground text-sm">Your data is stored locally until you sign in</p>
        </div>
      {/if}
    {:else}
      <div>
        {@render anonymous?.({ initiateAuth: handleSyncAttempt })}
      </div>
    {/if}
  </SignedOut>
{:else}
  <div>
    {@render anonymous?.({ initiateAuth: handleSyncAttempt })}
  </div>
{/if}

<style>
</style>
