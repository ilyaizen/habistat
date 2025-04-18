<script lang="ts">
  import { settings } from "$lib/stores/settings";
  import { Card, CardHeader, CardContent } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";

  import Switch from "$lib/components/ui/switch/switch.svelte";
  import SessionInfo from "$lib/components/session-info.svelte";
  import { anonymousUserId, initializeTracking } from "$lib/utils/tracking";
  import { onMount } from "svelte";

  import { locale } from "svelte-i18n";
  import { browser } from "$app/environment";
  import { Sun, Languages } from "lucide-svelte";
  import { resetMode, setMode } from "mode-watcher";

  // Theme
  let theme = "";
  function selectTheme(mode: "light" | "dark" | "system" | "ghibli" | "ghibli-dark") {
    // First, remove all theme classes
    document.documentElement.classList.remove("ghibli", "dark");

    if (mode === "system") {
      resetMode();
    } else if (mode === "ghibli") {
      document.documentElement.classList.add("ghibli");
      setMode("light");
    } else if (mode === "ghibli-dark") {
      document.documentElement.classList.add("ghibli", "dark");
      setMode("dark");
    } else {
      setMode(mode);
    }
    theme = mode;
  }

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
          variant={theme === "light" ? "default" : "outline"}
          onclick={() => selectTheme("light")}>Light</Button
        >
        <Button
          size="sm"
          variant={theme === "dark" ? "default" : "outline"}
          onclick={() => selectTheme("dark")}>Dark</Button
        >
        <Button
          size="sm"
          variant={theme === "system" ? "default" : "outline"}
          onclick={() => selectTheme("system")}>System</Button
        >
        <Button
          size="sm"
          variant={theme === "ghibli" ? "default" : "outline"}
          onclick={() => selectTheme("ghibli")}>Ghibli Light</Button
        >
        <Button
          size="sm"
          variant={theme === "ghibli-dark" ? "default" : "outline"}
          onclick={() => selectTheme("ghibli-dark")}>Ghibli Dark</Button
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
