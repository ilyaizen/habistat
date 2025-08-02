<script lang="ts">
  import { locale } from "svelte-i18n";
  import { browser } from "$app/environment";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  // Language switcher
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
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="ghost" class="h-8 w-8 px-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        class="h-[1.2rem] w-[1.2rem]"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 5h7"></path>
        <path d="M9 3v2c0 4.418 -2.239 8 -5 8"></path>
        <path d="M5 9c0 2.144 2.952 3.908 6.7 4"></path>
        <path d="M12 20l4 -9l4 9"></path>
        <path d="M19.1 18h-6.2"></path>
      </svg>
      <span class="sr-only">Change language</span>
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    {#each locales as loc (loc)}
      <DropdownMenu.Item onclick={() => handleLanguageChange(loc)} class="flex items-center gap-2">
        <img
          src={languageMap[loc].flagSrc}
          alt={loc.toUpperCase()}
          class="size-4 rounded-[3px]"
          width={16}
          height={16}
        />
        {languageMap[loc].name}
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
