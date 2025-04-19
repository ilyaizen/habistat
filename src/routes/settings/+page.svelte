<script lang="ts">
  import { settings, theme } from "$lib/stores/settings";
  import { Card, CardHeader, CardContent } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";

  import Switch from "$lib/components/ui/switch/switch.svelte";
  import SessionInfo from "$lib/components/session-info.svelte";
  import { anonymousUserId, initializeTracking } from "$lib/utils/tracking";
  import { onDestroy, onMount } from "svelte";

  import { locale } from "svelte-i18n";
  import { browser } from "$app/environment";
  import { Sun, Languages } from "lucide-svelte";
  import { resetMode, setMode } from "mode-watcher";

  // Theme
  import type { ThemeMode } from "$lib/stores/settings";
  import { get } from "svelte/store";

  let currentTheme: ThemeMode = get(theme);

  theme.subscribe((val) => {
    currentTheme = val;
  });

  let media: MediaQueryList | null = null;
  let systemListener: (() => void) | null = null;

  function applySystemTheme() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function setupSystemListener() {
    cleanupSystemListener();
    media = window.matchMedia('(prefers-color-scheme: dark)');
    systemListener = () => applySystemTheme();
    media.addEventListener('change', systemListener);
  }

  function cleanupSystemListener() {
    if (media && systemListener) {
      media.removeEventListener('change', systemListener);
    }
    media = null;
    systemListener = null;
  }

  function selectTheme(mode: ThemeMode) {
    if (mode === "system") {
      resetMode();
      applySystemTheme();
      setupSystemListener();
    } else {
      cleanupSystemListener();
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      setMode(mode);
    }
    theme.set(mode);
  }

  onMount(() => {
    if (get(theme) === "system") {
      applySystemTheme();
      setupSystemListener();
    } else {
      selectTheme(get(theme));
    }
    initializeTracking();
  });
  onDestroy(() => {
    cleanupSystemListener();
  });

  // Language
  const locales = ["en", "he", "es"] as const;
  const languageMap = {
    en: { name: "English", flagSrc: "/flag-us.png" },
    he: { name: "Hebrew", flagSrc: "/flag-il.png" },
    es: { name: "Spanish", flagSrc: "/flag-es.png" }
  } as const;
  function handleLanguageChange(newLocale: string) {
    locale.set(newLocale);
    if (browser) {
      localStorage.setItem("locale", newLocale);
      const dir = newLocale === "he" ? "rtl" : "ltr";
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", newLocale);
    }
  }
  $: developerMode = $settings.developerMode;

  $: if (!developerMode) $settings.showUsageHistory = false;

  onMount(() => {
    initializeTracking();
  });
</script>

<div class="container mx-auto max-w-xl space-y-8 p-4">
  <h1 class="mb-4 text-2xl font-semibold">Settings</h1>

  <Card class="mb-6">
    <CardHeader>
      <Label class="text-lg">Session</Label>
    </CardHeader>
    <CardContent>
      <SessionInfo userId={$anonymousUserId || undefined} />
    </CardContent>
  </Card>

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

  <Card class="mb-6">
    <CardHeader>
      <Label class="flex items-center gap-2"><Languages class="h-4 w-4" /> Language</Label>
    </CardHeader>
    <CardContent>
      <div class="mt-2 flex gap-4">
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

  <Card>
    <CardHeader>
      <Label class="text-lg">App Settings</Label>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex items-center justify-between">
        <Label for="devmode">Developer Mode</Label>
        <Switch id="devmode" bind:checked={$settings.developerMode} />
      </div>
      {#if developerMode}
        <div class="flex items-center justify-between">
          <Label for="usage">Show Usage History</Label>
          <Switch id="usage" bind:checked={$settings.showUsageHistory} />
        </div>
      {/if}
      <div class="flex items-center justify-between">
        <Label for="motion">Enable Animations</Label>
        <Switch id="motion" bind:checked={$settings.enableMotion} />
      </div>
    </CardContent>
  </Card>
</div>
