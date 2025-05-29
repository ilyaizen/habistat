<script lang="ts">
  import { Github } from "lucide-svelte";
  import EnvironmentIndicator from "./environment-indicator-old.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  export let onMoreInfo: () => void = () => {};
  // Get the current year for copyright
  // const currentYear = new Date().getFullYear();
  // Version number (hardcoded for now)
  const VERSION = "v0.0.0";
</script>

<footer class="border-border/40 border-t">
  <!--
    Footer layout:
    - Uses flex to space content between left and right
    - Left: Copyright and EnvironmentIndicator
    - Right: Version and social links
  -->
  <div class="container mx-auto flex h-16 items-center justify-between px-4">
    <!-- Left side: Copyright and EnvironmentIndicator -->
    <div class="text-muted-foreground flex items-center gap-4 text-sm">
      <Button
        class={`${buttonVariants({ variant: "outline" })} text-muted-foreground`}
        aria-label="Show more info"
        onclick={onMoreInfo}
      >
        More Info
      </Button>
      <!-- This is the footer... -->
    </div>

    <!-- Right side: Version and social links -->
    <div class="text-muted-foreground flex items-center gap-4 text-xs">
      <!-- Inline environment indicator (shows environment/platform/network) -->
      <EnvironmentIndicator />
      <!-- <span>{currentYear} &copy; Habistat</span> -->
      <!-- App version -->
      <span class="text-muted-foreground text-xs">{VERSION}</span>
      <!-- Social links -->
      <a href="https://github.com/ilyaizen/habistat" target="_blank" rel="noopener noreferrer">
        <Github class="h-4 w-4" />
      </a>
    </div>
  </div>
</footer>
