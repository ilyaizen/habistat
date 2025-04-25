<script lang="ts">
  import { Avatar, AvatarFallback } from "./ui/avatar";
  import * as DropdownMenu from "./ui/dropdown-menu";
  import { isSessionMigrated, SESSION_USER_ID_KEY, deleteUserSession } from "$lib/utils/tracking";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  // Track if user is authenticated
  let isAuthenticated = $state(false);
  let userInitial = $state("A");

  // Check auth state on mount
  onMount(() => {
    if (!browser) return;

    // Check if session is migrated (authenticated)
    isAuthenticated = isSessionMigrated();

    // Get user info if authenticated
    if (isAuthenticated) {
      const userId = localStorage.getItem(SESSION_USER_ID_KEY) || "";
      // Set initial to first character if available
      if (userId && userId.length > 0) {
        // Use the first character of the user ID as the initial
        userInitial = userId.charAt(0).toUpperCase();
      }
    }
  });

  // Handle profile navigation
  function goToProfile() {
    goto("/settings");
  }

  // Handle dashboard navigation
  function goToDashboard() {
    goto("/dashboard");
  }

  // Handle logout
  function handleLogout() {
    if (browser) {
      // Clear all user data
      deleteUserSession();

      // Navigate home
      goto("/");

      // Force reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Avatar class="border-border bg-muted h-8 w-8 border">
      <AvatarFallback class="text-muted-foreground text-xs font-bold">
        {userInitial}
      </AvatarFallback>
    </Avatar>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="mx-4 w-40">
    <DropdownMenu.Item onclick={goToDashboard}>Dashboard</DropdownMenu.Item>
    <DropdownMenu.Item onclick={goToProfile}>Profile</DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={handleLogout}>
      {isAuthenticated ? "Logout" : "Reset Session"}
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
