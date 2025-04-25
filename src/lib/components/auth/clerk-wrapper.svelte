<!-- clerk-wrapper.svelte -->
<script lang="ts">
  import { SignedOut, SignInButton } from "svelte-clerk";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";
  import {
    getSessionState,
    markSessionAuthInitiated,
    isSessionMigrated
  } from "$lib/utils/tracking";
  import SignedInWrapper from "./signed-in-wrapper.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { goto } from "$app/navigation";

  // Define props using Svelte 5 syntax
  const { initiateAuth, children } = $props<{
    initiateAuth: () => void;
    children: () => unknown;
  }>();

  // Get online status from context
  const isOnline = getContext<Writable<boolean>>("isOnline");

  // Local component state
  let isAuthInProgress = $state(false);
  let signInError = $state<string | null>(null);
  let isMigrated = $state(isSessionMigrated());

  // Check migration status on mount
  onMount(() => {
    if (browser) {
      isMigrated = isSessionMigrated();

      // Simple error handler for Clerk
      window.addEventListener("error", (e) => {
        if (e.message?.includes("Clerk") || e.filename?.includes("clerk")) {
          console.error("Clerk error detected:", e.message);
          signInError = `Auth error: ${e.message}`;
        }
      });

      // Clean up the current URL if it has Clerk parameters
      cleanCurrentUrl();

      // Set up a periodic cleaner to remove any Clerk parameters that appear
      const urlCleanerInterval = setInterval(cleanCurrentUrl, 1000);

      // Clean up interval on component destruction
      return () => {
        clearInterval(urlCleanerInterval);
      };
    }
  });

  // Only show claim session UI on dashboard page
  const showClaimSession = $derived(page.url.pathname.includes("/dashboard"));

  // Only show sign in on sign-in page
  const showSignIn = $derived(page.url.pathname === "/sign-in");

  /**
   * Helper to clean Clerk parameters from URLs
   */
  function cleanClerkParams(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);

      // Remove Clerk handshake and other Clerk-specific parameters
      urlObj.searchParams.delete("__clerk_handshake");
      urlObj.searchParams.delete("__clerk_status");
      urlObj.searchParams.delete("__clerk_created_session");

      // Clean fragment if it contains Clerk handshake params
      if (urlObj.hash && urlObj.hash.includes("__clerk")) {
        urlObj.hash = "";
      }

      // Convert back to a relative URL if it's on the same origin
      if (urlObj.origin === window.location.origin) {
        return urlObj.pathname + urlObj.search + urlObj.hash;
      }
      return urlObj.toString();
    } catch (e) {
      console.error("Error cleaning URL:", e);
      return url;
    }
  }

  /**
   * Checks and cleans the current URL of any Clerk parameters
   */
  function cleanCurrentUrl(): void {
    // Check both search params and hash for Clerk parameters
    if (
      !browser ||
      (!window.location.search.includes("__clerk") && !window.location.hash.includes("__clerk"))
    ) {
      return;
    }

    try {
      const cleanedUrl = cleanClerkParams(window.location.href);
      if (cleanedUrl !== window.location.href) {
        // Replace state without triggering a navigation
        window.history.replaceState(null, "", cleanedUrl);
        console.log("Cleaned Clerk parameters from URL");
      }
    } catch (e) {
      console.error("Failed to clean current URL:", e);
    }
  }

  /**
   * Handles auth initiation when user requests sign in
   */
  function handleSignIn() {
    if (!$isOnline || isAuthInProgress) return;

    // Set loading state
    isAuthInProgress = true;
    signInError = null;

    try {
      // Mark session as initiated
      markSessionAuthInitiated();
      // Call the parent's initiateAuth function
      initiateAuth();

      // Try to open Clerk sign-in if available
      setTimeout(() => {
        if (typeof window.Clerk?.openSignIn === "function") {
          window.Clerk.openSignIn({
            redirectUrl: window.location.href,
            afterSignInUrl: window.location.href
          });
        } else {
          // Fallback to hosted sign-in page
          const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
          if (publishableKey) {
            const keyParts = publishableKey.split("_");
            if (keyParts.length > 1) {
              const clerkDomain = `https://${keyParts[1]}.clerk.accounts.dev`;
              const returnUrl = encodeURIComponent(window.location.href);
              window.location.href = `${clerkDomain}/sign-in?redirect_url=${returnUrl}`;
            }
          }
        }
      }, 100);
    } catch (error) {
      console.error("Sign-in error:", error);
      signInError = "Error during sign-in: " + String(error);
    } finally {
      // Reset loading after a delay
      setTimeout(() => {
        isAuthInProgress = false;
      }, 500);
    }
  }
</script>

{#if browser}
  <!-- First render SignedInWrapper to handle auth state -->
  <SignedInWrapper>
    {@render children?.()}
  </SignedInWrapper>

  <!-- Then render SignedOut content for anonymous users -->
  <SignedOut>
    {#if showSignIn && $isOnline}
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <h2 class="text-xl font-semibold">Sign in to Habistat</h2>

        {#if signInError}
          <Alert variant="destructive">
            <AlertDescription>
              {signInError}
            </AlertDescription>
          </Alert>
        {/if}

        <Button
          variant="default"
          class="w-full max-w-xs"
          onclick={handleSignIn}
          disabled={isAuthInProgress}
        >
          {#if isAuthInProgress}
            Connecting...
          {:else}
            Sign in with Clerk
          {/if}
        </Button>

        <p class="text-muted-foreground text-sm">
          Your data will remain safe and migrate to your account
        </p>
      </div>
    {:else if !$isOnline && showSignIn}
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Alert variant="destructive">
          <AlertDescription>
            You are currently offline. Your data will be stored locally and can be synced when
            you're back online.
          </AlertDescription>
        </Alert>
        <p class="text-muted-foreground">Continue using the app in offline mode</p>
      </div>
    {:else}
      <div class="anonymous-content">
        {@render children?.()}
        {#if showClaimSession && !isMigrated}
          <div class="claim-session-container">
            <!-- Account Sync Card -->
            <Card.Root class="mx-auto w-full max-w-md">
              <Card.Header>
                <Card.Title>Account Sync</Card.Title>
                <Card.Description>
                  You're currently using Habistat anonymously. Sign in to sync your data across
                  devices.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                {#if signInError}
                  <Alert variant="destructive" class="mb-4">
                    <AlertDescription>
                      {signInError}
                    </AlertDescription>
                  </Alert>
                {/if}

                <Button
                  variant="default"
                  class="w-full"
                  onclick={handleSignIn}
                  disabled={!$isOnline || isAuthInProgress}
                >
                  {#if isAuthInProgress}
                    Connecting...
                  {:else if !$isOnline}
                    Continue in Offline Mode
                  {:else}
                    Sign In to Sync Data
                  {/if}
                </Button>

                {#if !$isOnline}
                  <p class="text-muted-foreground mt-2 text-center text-xs">
                    You're offline. Connect to the internet to sync your data.
                  </p>
                {/if}
              </Card.Content>
            </Card.Root>
          </div>
        {/if}
      </div>
    {/if}
  </SignedOut>
{:else}
  <!-- Server-side fallback (always anonymous) -->
  <div class="anonymous-content">
    {@render children?.()}
  </div>
{/if}

<style>
  .anonymous-content {
    width: 100%;
  }

  .claim-session-container {
    margin-top: 2rem;
  }
</style>
