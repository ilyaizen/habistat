<script lang="ts">
  import { Moon, Sun } from "@lucide/svelte";
  import { theme } from "$lib/stores/settings";
  import type { ThemeMode } from "$lib/stores/settings";
  import { setMode, resetMode } from "mode-watcher";
  import { Button } from "./ui/button";
  import * as DropdownMenu from "./ui/dropdown-menu";
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="ghost" class="h-8 w-8 px-0">
      <Sun class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0" />
      <Moon
        class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
      />
      <span class="sr-only">Toggle theme</span>
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item
      onclick={() => {
        theme.set("light");
        setMode("light");
      }}>Light</DropdownMenu.Item
    >
    <DropdownMenu.Item
      onclick={() => {
        theme.set("dark");
        setMode("dark");
      }}>Dark</DropdownMenu.Item
    >
    <DropdownMenu.Item
      onclick={() => {
        theme.set("system");
        resetMode();
      }}>System</DropdownMenu.Item
    >
  </DropdownMenu.Content>
</DropdownMenu.Root>
