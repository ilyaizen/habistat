<script lang="ts">
  import { Avatar, AvatarFallback } from "./ui/avatar";
  import { getContext } from "svelte";
  import { goto } from "$app/navigation";
  import type { UserResource } from "@clerk/types";
  import { type Readable } from "svelte/store";

  // Get Clerk user context for authentication state
  const clerkUser = getContext<Readable<UserResource | null>>("clerkUser");

  // Handle click: go to settings and set account tab
  function goToAccountSettings() {
    // Store tab in localStorage so settings page can pick it up
    localStorage.setItem("settingsTab", "account");
    goto("/settings");
  }
</script>

<!-- Avatar button: shows user avatar if available, fallback to initial -->
<button
  type="button"
  class="border-border bg-muted h-8 w-8 overflow-hidden rounded-full border"
  onclick={goToAccountSettings}
  aria-label="Account settings"
>
  {#if $clerkUser?.imageUrl}
    <img src={$clerkUser.imageUrl} alt="User avatar" class="h-8 w-8 object-cover" />
  {:else}
    <AvatarFallback class="text-muted-foreground text-xs font-bold">
      {$clerkUser?.id ? $clerkUser.id.charAt(0).toUpperCase() : "A"}
    </AvatarFallback>
  {/if}
</button>
