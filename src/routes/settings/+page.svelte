<script lang="ts">
  // Import stores for settings and theme management
  import { settings, theme } from "$lib/stores/settings";
  // Import UI components from the library
  import { Card, CardHeader, CardContent } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { goto } from "$app/navigation";

  // Import custom components
  import Switch from "$lib/components/ui/switch/switch.svelte";
  import SessionInfo from "$lib/components/session-info.svelte";
  import SyncStatus from "$lib/components/sync-status.svelte";
  // import ActivityMonitor from "$lib/components/activity-monitor.svelte";
  import SettingsDataTab from "$lib/components/settings-data-tab.svelte";
  // Import tracking utilities
  import { anonymousUserId, getAppOpenHistory, logAppOpenIfNeeded } from "$lib/utils/tracking";
  // Import Svelte lifecycle hooks
  import { onDestroy, onMount } from "svelte";

  // Import i18n for localization
  import { locale } from "svelte-i18n";
  import { browser } from "$app/environment";
  // Import icons
  import { Sun, Languages, LoaderPinwheel, Cloud, RefreshCw, Database } from "@lucide/svelte";

  // Import theme mode management functions
  import { resetMode, setMode } from "mode-watcher";

  // Define type for theme mode
  import type { ThemeMode } from "$lib/stores/settings";
  import { get } from "svelte/store";

  // Import tab bar UI components
  import { Tabs, TabsList, TabsTrigger } from "$lib/components/ui/tabs";

  // Import wrapper for tab content transitions
  import TabMotionWrapper from "$lib/components/tab-motion-wrapper.svelte";

  // Import sync store for sync functionality
  import { syncStore, isSyncing, syncError, lastSyncTime, syncIsOnline } from "$lib/stores/sync";

  // State for the active settings tab, defaults to 'customization'
  let activeTab = $state("customization");

  // Reactive state for the current theme, initialized from the store
  let currentTheme = $state(get(theme));

  // Subscribe to theme store changes to keep currentTheme updated
  theme.subscribe((val) => {
    currentTheme = val;
  });

  // Variables to manage system theme media query and listener
  let media: MediaQueryList | null = null;
  let systemListener: (() => void) | null = null;

  /**
   * Applies the system's preferred color scheme (dark/light) to the document.
   */
  function applySystemTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  /**
   * Sets up a listener for changes in the system's color scheme preference.
   */
  function setupSystemListener() {
    cleanupSystemListener(); // Ensure no duplicate listeners
    media = window.matchMedia("(prefers-color-scheme: dark)");
    systemListener = () => applySystemTheme();
    media.addEventListener("change", systemListener);
  }

  /**
   * Removes the system theme change listener.
   */
  function cleanupSystemListener() {
    if (media && systemListener) {
      media.removeEventListener("change", systemListener);
    }
    media = null;
    systemListener = null;
  }

  /**
   * Selects and applies a new theme mode.
   * @param mode - The theme mode to apply ('light', 'dark', or 'system').
   */
  function selectTheme(mode: ThemeMode) {
    if (mode === "system") {
      resetMode(); // Resets to system theme via mode-watcher
      applySystemTheme();
      setupSystemListener();
    } else {
      cleanupSystemListener(); // No need for system listener on manual override
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      setMode(mode); // Persists the selected mode
    }
    theme.set(mode); // Update the theme store
  }

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

    // Initialize theme based on stored preference
    if (get(theme) === "system") {
      applySystemTheme();
      setupSystemListener();
    } else {
      selectTheme(get(theme));
    }
  });
  // Cleanup listener when the component is destroyed
  onDestroy(() => {
    cleanupSystemListener();
  });

  // Language settings
  const locales = ["en", "he", "es"] as const; // Supported locales
  const languageMap = {
    // Map locales to names and flag images
    en: { name: "English", flagSrc: "/flag-us.png" },
    he: { name: "Hebrew", flagSrc: "/flag-il.png" },
    es: { name: "Spanish", flagSrc: "/flag-es.png" }
  } as const;
  /**
   * Handles language change, updates locale store and document attributes.
   * @param newLocale - The new locale to set.
   */
  function handleLanguageChange(newLocale: string) {
    locale.set(newLocale);
    if (browser) {
      localStorage.setItem("locale", newLocale);
      const dir = newLocale === "he" ? "rtl" : "ltr"; // Set text direction for RTL languages
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", newLocale);
    }
  }

  const developerMode = $derived($settings.developerMode);

  // Automatically hide usage history if developer mode is turned off
  $effect(() => {
    if (!developerMode) {
      settings.update((s) => ({ ...s, showUsageHistory: false }));
    }
  });

  // State for usage history feature
  let usageHistoryTimestamps = $state<number[]>([]);
  let loadingUsageHistory = $state(false);
  let activeDatesSet = $state(new Set<string>()); // Set of dates with app usage

  /**
   * Helper function to format a Date object into a 'YYYY-MM-DD' string.
   * This uses the local timezone.
   * @param date - The date to format.
   * @returns The formatted date string.
   */
  function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Reactive effect to load usage history when the 'data' tab is active and conditions are met
  $effect(() => {
    if (activeTab === "data" && developerMode && $settings.showUsageHistory) {
      loadUsageHistory();
    }
  });

  /**
   * Asynchronously loads app open history and formats it for display.
   */
  async function loadUsageHistory() {
    loadingUsageHistory = true;
    usageHistoryTimestamps = await getAppOpenHistory();
    // Use the local date formatter to prevent timezone issues.
    activeDatesSet = new Set(usageHistoryTimestamps.map((ts) => formatLocalDate(new Date(ts))));
    usageHistoryTimestamps = usageHistoryTimestamps.slice().reverse(); // Show most recent first
    loadingUsageHistory = false;
  }
</script>

<!-- Main container for the settings page -->
<div class="container mx-auto max-w-xl space-y-8 p-4">
  <h1 class="mb-4 text-2xl font-semibold">Settings</h1>

  <!-- Tab navigation for different settings categories -->
  <Tabs bind:value={activeTab} class="w-full">
    <TabsList class="mb-4 flex w-full justify-between">
      <!-- Tab triggers for each section -->
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="customization">Customization</TabsTrigger>
      <TabsTrigger value="sync">Sync</TabsTrigger>
      <TabsTrigger value="data">Data</TabsTrigger>
    </TabsList>
    <!-- Wrapper to animate transitions between tab content -->
    <TabMotionWrapper key={activeTab}>
      {#if activeTab === "account"}
        <!-- Account Information Section -->
        <Card class="mb-6">
          <CardContent>
            <!-- Displays user session and authentication status -->
            <SessionInfo />
          </CardContent>
        </Card>
      {:else if activeTab === "customization"}
        <!-- Theme Selection Section -->
        <Card class="mb-6">
          <CardHeader>
            <Label class="flex items-center gap-2"><Sun class="h-4 w-4" /> Theme</Label>
          </CardHeader>
          <CardContent>
            <div class="mt-2 flex flex-wrap gap-4">
              <Button
                size="sm"
                variant={currentTheme === "light" ? "default" : "outline"}
                onclick={() => selectTheme("light")}>Light</Button
              >
              <Button
                size="sm"
                variant={currentTheme === "dark" ? "default" : "outline"}
                onclick={() => selectTheme("dark")}>Dark</Button
              >
              <Button
                size="sm"
                variant={currentTheme === "system" ? "default" : "outline"}
                onclick={() => selectTheme("system")}>System</Button
              >
            </div>
          </CardContent>
        </Card>
        <!-- Language Selection Section -->
        <Card class="mb-6">
          <CardHeader>
            <Label class="flex items-center gap-2"><Languages class="h-4 w-4" /> Language</Label>
          </CardHeader>
          <CardContent>
            <div class="mt-2 flex w-full flex-wrap justify-start gap-4">
              {#each locales as loc}
                <Button
                  size="sm"
                  variant={$locale === loc ? "default" : "outline"}
                  class="flex items-center gap-2"
                  onclick={() => handleLanguageChange(loc)}
                >
                  <img
                    src={languageMap[loc].flagSrc}
                    alt={loc.toUpperCase()}
                    class="size-4 rounded-[3px]"
                    width={16}
                    height={16}
                  />
                  {languageMap[loc].name}
                </Button>
              {/each}
            </div>
          </CardContent>
        </Card>
        <!-- Animations Toggle Section -->
        <Card class="mb-6">
          <CardHeader>
            <Label class="flex items-center gap-2" for="motion">
              <LoaderPinwheel class="h-4 w-4" /> Animations
            </Label>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between">
              <Label for="motion">Enable Animations</Label>
              <Switch id="motion" bind:checked={$settings.enableMotion} />
            </div>
          </CardContent>
        </Card>
      {:else if activeTab === "sync"}
        <!-- Sync Settings Section -->
        <Card class="mb-6">
          <CardHeader>
            <Label class="flex items-center gap-2"><Cloud class="h-4 w-4" /> Sync Status</Label>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Current sync status display -->
            <div class="flex flex-col space-y-3">
              <SyncStatus />

              <!-- Sync controls -->
              <div class="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => syncStore.triggerSync()}
                  disabled={$isSyncing || !$syncIsOnline}
                  class="flex items-center gap-2"
                >
                  <RefreshCw class="h-3 w-3 {$isSyncing ? 'animate-spin' : ''}" />
                  {$isSyncing ? "Syncing..." : "Sync Now"}
                </Button>

                {#if $syncError}
                  <Button
                    size="sm"
                    variant="secondary"
                    onclick={() => syncStore.clearError()}
                    class="flex items-center gap-2"
                  >
                    Clear Error
                  </Button>
                {/if}
              </div>

              <!-- Sync information -->
              <div class="text-muted-foreground space-y-1 text-sm">
                <p>
                  <strong>Status:</strong>
                  {#if $syncIsOnline}
                    Connected to cloud
                  {:else}
                    Offline mode - changes saved locally
                  {/if}
                </p>
                {#if $lastSyncTime}
                  <p>
                    <strong>Last sync:</strong>
                    {new Date($lastSyncTime).toLocaleString()}
                  </p>
                {/if}
                <p class="text-xs">
                  Your data automatically syncs when you're online and signed in. All changes are
                  saved locally first to ensure no data is lost.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Data Migration Section (for developer info) -->
        {#if developerMode}
          <Card>
            <CardHeader>
              <Label class="flex items-center gap-2"
                ><Database class="h-4 w-4" /> Data Migration</Label
              >
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="text-muted-foreground text-sm">
                <p>Anonymous data migration happens automatically when you first sign in.</p>
                <p>This section is visible because Developer Mode is enabled.</p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onclick={() => syncStore.migrateAnonymousData()}
                disabled={$isSyncing}
                class="flex items-center gap-2"
              >
                <Database class="h-3 w-3" />
                Trigger Migration
              </Button>
            </CardContent>
          </Card>
        {/if}
      {:else if activeTab === "data"}
        <!-- Data and Developer Settings Section -->
        <SettingsDataTab />
      {/if}
    </TabMotionWrapper>
  </Tabs>
</div>

<!--
  Developer Comments:
  - This component serves as the main settings page, organized into tabs for better UX.
  - Sections include Account, Customization, Sync (placeholder), and Data (with developer options).
  - State is managed using Svelte stores for settings, theme, and i18n locale.
  - The 'mode-watcher' library is used for handling theme changes, including system preference.
  - The component is designed to be modular, allowing for future extraction of tab content into separate components or routes if needed.
-->
