<script lang="ts">
import type { UserResource } from "@clerk/types";
import { getContext } from "svelte";
import { type Readable } from "svelte/store";
import { goto } from "$app/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

// Get Clerk user context for authentication state
const clerkUser = getContext<Readable<UserResource | null>>("clerkUser");

// Handle click: go to settings and set account tab
function goToAccountSettings() {
  // Store tab in localStorage so settings page can pick it up
  localStorage.setItem("settingsTab", "account");
  goto("/settings");
}
</script>

<!-- Avatar button: shows user avatar if available, fallback to initial or anonymous icon -->
<Avatar
  class="border-border bg-muted h-8 w-8 overflow-hidden rounded-full border"
  onclick={goToAccountSettings}
  aria-label="Account settings"
>
  {#if $clerkUser?.imageUrl}
    <AvatarImage src={$clerkUser.imageUrl} alt="User avatar" class="h-8 w-8 object-cover" />
  {/if}
  <AvatarFallback class="text-muted-foreground text-xs font-bold">
    <!-- Show first letter of user id if available, otherwise generic anonymous icon -->
    {$clerkUser?.id ? $clerkUser.id.charAt(0).toUpperCase() : "A"}
  </AvatarFallback>
</Avatar>
