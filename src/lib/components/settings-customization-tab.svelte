<script lang="ts">
  import { settings, theme } from "$lib/stores/settings";
  import { Card, CardHeader, CardContent } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import Switch from "$lib/components/ui/switch/switch.svelte";
  import { locale } from "svelte-i18n";
  import { browser } from "$app/environment";
  import { Sun, Languages, LoaderPinwheel } from "@lucide/svelte";
  import { resetMode, setMode } from "mode-watcher";
  import type { ThemeMode } from "$lib/stores/settings";
  import { get } from "svelte/store";
  import { onDestroy, onMount } from "svelte";

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

  // Initialize theme on mount
  onMount(() => {
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
</script>

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
