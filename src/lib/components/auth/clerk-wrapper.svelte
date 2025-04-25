<!-- clerk-wrapper.svelte -->
<script lang="ts">
  import { SignedOut, SignInButton } from "svelte-clerk";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import { onMount, onDestroy } from "svelte";
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
  let hasAttemptedSync = $state(false);
  let isClerkLoaded = $state(false);
  let isAuthInitiated = $state(false);
  let isAuthInProgress = $state(false);
  let signInError = $state<string | null>(null);

  // Check for existing migration
  let isMigrated = $state(isSessionMigrated());

  // For intervals
  let migrationCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Allow force loading of the Clerk SDK to access the API
  loadClerk();

  // Check session state on mount
  onMount(() => {
    if (browser) {
      const sessionState = getSessionState();
      isAuthInitiated = sessionState === "pending" || sessionState === "claimed";
      isMigrated = isSessionMigrated();

      // Set up a simple error handler for Clerk
      window.addEventListener("error", (e) => {
        if (e.message?.includes("Clerk") || e.filename?.includes("clerk")) {
          console.error("Clerk error detected:", e.message);
          signInError = `Auth error: ${e.message}`;
        }
      });

      // Add popup blocked detection
      window.addEventListener("unload", () => {
        // This won't execute if a popup is blocked
      });

      // Check migration status every 2 seconds
      migrationCheckInterval = setInterval(() => {
        const newMigrationStatus = isSessionMigrated();
        if (newMigrationStatus !== isMigrated) {
          isMigrated = newMigrationStatus;
          console.log("Migration status changed:", isMigrated);
        }
      }, 2000);

      // Patch Clerk's history methods to use SvelteKit's router
      patchClerkHistoryMethods();
    }
  });

  // Clean up on component destroy
  onDestroy(() => {
    if (migrationCheckInterval) {
      clearInterval(migrationCheckInterval);
    }
  });

  // Only show claim session UI on dashboard page
  const showClaimSession = $derived(page.url.pathname.includes("/dashboard"));

  // Only show sign in on sign-in page
  const showSignIn = $derived(page.url.pathname === "/sign-in");

  /**
   * Patch Clerk's history methods to use SvelteKit's router
   * This prevents conflicts with SvelteKit's routing system
   */
  function patchClerkHistoryMethods() {
    if (!browser || !window.Clerk) return;

    try {
      // Store original methods
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      /**
       * Helper to clean Clerk parameters from URLs
       * @param url URL to clean
       * @returns Cleaned URL string
       */
      const cleanClerkParams = (url) => {
        if (typeof url !== "string") return url;

        try {
          const urlObj = new URL(url, window.location.origin);
          // Remove Clerk handshake and other Clerk-specific parameters
          urlObj.searchParams.delete("__clerk_handshake");
          urlObj.searchParams.delete("__clerk_status");
          urlObj.searchParams.delete("__clerk_created_session");

          // Convert back to a relative URL if it's on the same origin
          if (urlObj.origin === window.location.origin) {
            return urlObj.pathname + urlObj.search;
          }
          return urlObj.toString();
        } catch (e) {
          console.error("Error cleaning URL:", e);
          return url;
        }
      };

      // Override history.pushState
      history.pushState = function (...args) {
        // Check if the call is from Clerk
        const isClerkCall = new Error().stack?.includes("clerk");

        if (isClerkCall) {
          // Use goto for navigation instead
          const url = args[2];
          if (typeof url === "string") {
            // Clean the URL of Clerk parameters
            const cleanedUrl = cleanClerkParams(url);

            // Make it relative if it's an absolute URL to this site
            const currentOrigin = window.location.origin;
            const targetUrl = cleanedUrl.startsWith(currentOrigin)
              ? cleanedUrl.slice(currentOrigin.length)
              : cleanedUrl;

            // Only use goto for same-origin URLs
            if (targetUrl.startsWith("/")) {
              try {
                goto(targetUrl);
                return;
              } catch (e) {
                console.error("Failed to navigate with goto, falling back to original method:", e);
                // If goto fails, still use cleaned URL
                args[2] = cleanedUrl;
                return originalPushState.apply(history, args);
              }
            } else {
              // For external URLs, still clean them
              args[2] = cleanedUrl;
            }
          }
        }

        // For non-Clerk calls, use the original method
        return originalPushState.apply(history, args);
      };

      // Override history.replaceState
      history.replaceState = function (...args) {
        // Check if the call is from Clerk
        const isClerkCall = new Error().stack?.includes("clerk");

        if (isClerkCall) {
          // For Clerk calls, clean the URL and possibly navigate
          const url = args[2];
          if (typeof url === "string") {
            const cleanedUrl = cleanClerkParams(url);

            // For same-origin URLs, use goto
            if (cleanedUrl.startsWith("/") || cleanedUrl.startsWith(window.location.origin)) {
              const targetUrl = cleanedUrl.startsWith(window.location.origin)
                ? cleanedUrl.slice(window.location.origin.length)
                : cleanedUrl;

              try {
                if (isMigrated) {
                  // Only navigate if migration is complete
                  goto(targetUrl, { replaceState: true });
                } else {
                  // Otherwise just clean the URL in place
                  args[2] = cleanedUrl;
                  return originalReplaceState.apply(history, args);
                }
                return;
              } catch (e) {
                console.error("Failed to navigate with goto:", e);
                // If goto fails, still use cleaned URL
                args[2] = cleanedUrl;
                return originalReplaceState.apply(history, args);
              }
            } else {
              // For external URLs, still clean them
              args[2] = cleanedUrl;
              return originalReplaceState.apply(history, args);
            }
          }
          return;
        }

        // For non-Clerk calls, use the original method
        return originalReplaceState.apply(history, args);
      };

      // Also clean up the current URL if it has Clerk parameters
      if (window.location.search.includes("__clerk")) {
        try {
          const currentPath = window.location.pathname;
          const cleanedUrl = cleanClerkParams(window.location.href);
          if (cleanedUrl !== window.location.href) {
            // Only replace state, don't navigate
            window.history.replaceState(null, "", cleanedUrl);
          }
        } catch (e) {
          console.error("Failed to clean current URL:", e);
        }
      }

      console.log("Successfully patched Clerk history methods");
    } catch (error) {
      console.error("Failed to patch Clerk history methods:", error);
    }
  }

  /**
   * Loads Clerk SDK if not already loaded
   */
  function loadClerk() {
    if (isClerkLoaded) return;

    console.log("Loading Clerk SDK...");
    isClerkLoaded = true;
  }

  /**
   * Handles sync attempt when user initiates auth
   */
  function handleSyncAttempt() {
    if (!$isOnline) {
      console.warn("Cannot sync while offline");
      return;
    }

    // Set loading state
    isAuthInProgress = true;
    signInError = null;

    // Mark session as auth initiated
    markSessionAuthInitiated();
    isAuthInitiated = true;
    hasAttemptedSync = true;

    // Call the parent's initiateAuth function
    initiateAuth();

    // Reset loading state after a short delay
    setTimeout(() => {
      isAuthInProgress = false;
    }, 500);
  }

  // Function to prepare for auth
  function prepareForAuth() {
    if (!$isOnline || isAuthInProgress) return;

    isAuthInProgress = true;
    signInError = null;

    try {
      // Mark session as initiated
      markSessionAuthInitiated();
      // Call the parent's initiateAuth function
      initiateAuth();

      console.log("Auth preparation complete");
    } catch (error) {
      console.error("Failed to prepare for auth:", error);
      signInError = "Failed to prepare auth: " + String(error);
    } finally {
      // Reset loading after a short delay
      setTimeout(() => {
        isAuthInProgress = false;
      }, 500);
    }
  }

  // Handle manual redirect to Clerk sign-in
  function handleDirectSignIn() {
    prepareForAuth();

    // Use a safer approach that doesn't depend on direct Clerk API
    try {
      // Use a slight delay to ensure Clerk has time to initialize
      setTimeout(() => {
        // Check if Clerk is properly initialized
        if (typeof window.Clerk?.openSignIn === "function") {
          window.Clerk.openSignIn({
            redirectUrl: window.location.href,
            afterSignInUrl: window.location.href
          });
        } else {
          // Fallback - redirect to the Clerk-hosted sign-in page
          try {
            const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
            if (publishableKey) {
              const keyParts = publishableKey.split("_");
              if (keyParts.length > 1) {
                const clerkDomain = `https://${keyParts[1]}.clerk.accounts.dev`;
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `${clerkDomain}/sign-in?redirect_url=${returnUrl}`;
              } else {
                throw new Error("Invalid Clerk publishable key format");
              }
            } else {
              throw new Error("Clerk publishable key not found");
            }
          } catch (err) {
            console.error("Error constructing Clerk URL:", err);
            signInError = "Error with auth configuration: " + String(err);
          }
        }
      }, 100);
    } catch (e) {
      console.error("Error redirecting to sign-in:", e);
      signInError = "Could not open sign-in: " + String(e);
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

        <!-- Direct rendering of sign in button -->
        <Button
          variant="default"
          class="w-full max-w-xs"
          onclick={handleDirectSignIn}
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

                <!-- Direct Button instead of SignInButton -->
                <Button
                  variant="default"
                  class="w-full"
                  onclick={handleDirectSignIn}
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
