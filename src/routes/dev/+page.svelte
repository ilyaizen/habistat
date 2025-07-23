<script lang="ts">
// Import stores for settings management

// Import tracking utilities
// import { anonymousUserId, logAppOpenIfNeeded } from "$lib/utils/tracking";
// Import Svelte lifecycle hooks
import { onMount } from "svelte";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
// Import custom tab components
import DevSettingsTab from "$lib/components/settings-dev-tab.svelte";
import { settings } from "$lib/stores/settings";

// import { get } from "svelte/store";

// Import wrapper for tab content transitions
import TabMotionWrapper from "$lib/components/tab-motion-wrapper.svelte";
// Import tab bar UI components
import { Tabs, TabsList, TabsTrigger } from "$lib/components/ui/tabs";

// State for the active settings tab, defaults to 'customization'
let activeTab = $state("dev");

// On component mount, perform initial setup
onMount(() => {
  // logAppOpenIfNeeded(); // Log application opening for tracking
  // Redirect to home if not in dev mode
  if (!$settings.developerMode) {
    console.log("Not in developer mode, redirecting to home");
    goto("/", { replaceState: true });
    return;
  }

  // Check localStorage for a requested tab to open
  if (browser) {
    const tab = localStorage.getItem("devTab");
    if (tab) {
      activeTab = tab;
      localStorage.removeItem("devTab"); // Clean up after use
    }
  }
});
</script>

<!-- Main container for the dev page -->
<div class="container mx-auto max-w-xl space-y-8 p-4">
  <h1 class="mb-4 text-2xl font-semibold">Developer Tools</h1>

  <!-- Tab navigation for different settings categories -->
  <Tabs bind:value={activeTab} class="w-full">
    <TabsList class="mb-4 flex w-full justify-between">
      <!-- Tab triggers for each section -->
      <TabsTrigger value="dev">Dev</TabsTrigger>
    </TabsList>
    <!-- Wrapper to animate transitions between tab content -->
    <TabMotionWrapper key={activeTab}>
      {#if activeTab === "dev"}
        <DevSettingsTab />
      {/if}
    </TabMotionWrapper>
  </Tabs>
</div>
