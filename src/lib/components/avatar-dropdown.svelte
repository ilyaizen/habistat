<script lang="ts">
  import { Avatar, AvatarFallback } from "./ui/avatar";
  import * as DropdownMenu from "./ui/dropdown-menu";
  import { isSessionMigrated, SESSION_USER_ID_KEY } from "$lib/utils/tracking";
  import { handleLogout } from "$lib/utils/auth";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
  } from "./ui/alert-dialog";

  // Track if user is authenticated
  let isAuthenticated = $state(false);
  let userInitial = $state("A");
  let confirmDialogOpen = $state(false);
  let loggingOut = $state(false);

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

  // Handle settings navigation
  function goToSettings() {
    goto("/settings");
  }

  // Handle dashboard navigation
  function goToDashboard() {
    goto("/dashboard");
  }

  // Handle logout with confirmation via AlertDialog
  async function logoutWithConfirm() {
    if (loggingOut) return;

    loggingOut = true;
    try {
      // Use the centralized handleLogout function
      await handleLogout();
      // handleLogout already handles navigation and reload
    } catch (error) {
      console.error("Failed to log out:", error);
    } finally {
      loggingOut = false;
      confirmDialogOpen = false;
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
    <DropdownMenu.Item onclick={goToSettings}>Settings</DropdownMenu.Item>
    <DropdownMenu.Separator />

    <!-- Use DropdownMenu item to open the confirmation dialog -->
    <DropdownMenu.Item onclick={() => (confirmDialogOpen = true)}>
      {isAuthenticated ? "Logout" : "Reset Session"}
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Alert Dialog for logout confirmation -->
<AlertDialog bind:open={confirmDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {isAuthenticated ? "Logout?" : "Reset Session?"}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {isAuthenticated
          ? "Are you sure you want to log out of your account?"
          : "Are you sure you want to reset your anonymous session? This will clear all local data."}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onclick={logoutWithConfirm}
        class={isAuthenticated
          ? ""
          : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
      >
        {loggingOut ? "Processing..." : isAuthenticated ? "Logout" : "Reset"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
