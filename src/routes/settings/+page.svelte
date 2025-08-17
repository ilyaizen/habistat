<script lang="ts">
  // Import stores for settings management
  // import { settings } from "$lib/stores/settings";

  // Import Svelte lifecycle hooks
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  // Import custom tab components
  import SettingsAccountTab from "$lib/components/settings-account-tab.svelte";
  import SettingsCustomizationTab from "$lib/components/settings-customization-tab.svelte";
  import SettingsDataTab from "$lib/components/settings-data-tab.svelte";
  import SettingsSyncTab from "$lib/components/settings-sync-tab.svelte";
  // Import wrapper for tab content transitions
  import TabMotionWrapper from "$lib/components/tab-motion-wrapper.svelte";

  // Import tab bar UI components
  import { Tabs, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  // Import tracking utilities
  import { anonymousUserId, logAppOpenIfNeeded } from "$lib/utils/tracking";

  // State for the active settings tab, defaults to 'customization'
  let activeTab = $state("customization");

  // On component mount, perform initial setup
  onMount(() => {
    logAppOpenIfNeeded(); // Log application opening for tracking
    // Redirect to home if no anonymous user ID is found (ensures user is identified)
    if (!get(anonymousUserId)) {
      console.log("No user ID found in settings, redirecting to home");
      goto("/", { replaceState: true });
      return;
    }

    // Check localStorage for a requested tab to open
    if (browser) {
      const tab = localStorage.getItem("settingsTab");
      if (tab) {
        activeTab = tab;
        localStorage.removeItem("settingsTab"); // Clean up after use
      }
    }
  });
</script>

<!-- Main container for the settings page -->
<div class="container mx-auto max-w-xl space-y-8 p-4">
  <h1 class="mb-4 text-2xl font-semibold">Settings</h1>

  <!-- Tab navigation for different settings categories -->
  <Tabs bind:value={activeTab} class="w-full">
    <TabsList class="mb-4 flex w-full justify-between">
      <!-- Tab triggers for each section -->
      <TabsTrigger value="customization">Customization</TabsTrigger>
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="sync">Sync</TabsTrigger>
      <TabsTrigger value="data">Data</TabsTrigger>
    </TabsList>
    <!-- Wrapper to animate transitions between tab content -->
    <TabMotionWrapper key={activeTab}>
      {#if activeTab === "customization"}
        <SettingsCustomizationTab />
      {:else if activeTab === "account"}
        <SettingsAccountTab />
      {:else if activeTab === "sync"}
        <SettingsSyncTab />
      {:else if activeTab === "data"}
        <SettingsDataTab />
      {/if}
    </TabMotionWrapper>
  </Tabs>
</div>

<!--
  Developer Comments:
  - This component serves as the main settings page, organized into tabs for better UX.
  - Each tab is now implemented as a separate component for better code organization and maintainability.
  - Sections include Account, Customization, Sync, and Data (with developer options).
  - Tab switching is managed here, while each tab component handles its own state and logic.
-->
