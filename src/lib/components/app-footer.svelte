<script lang="ts">
  // import EnvironmentIndicator from "./environment-indicator-old.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import SocialLinks from "./social-links.svelte";
  import QuoteOfTheDay from "./quote-of-the-day.svelte";
  let { onMoreInfo = () => {} }: { onMoreInfo?: () => void } = $props();
  // Get the current year for copyright
  // const currentYear = new Date().getFullYear();
  // Version number (hardcoded for now)
</script>

<footer class="border-border/40 border-t">
  <!--
    Footer layout:
    - Uses grid with 3 columns for left, center, right sections
    - Left: More Info button (auto width)
    - Center: Quote of the Day component (takes remaining space)
    - Right: Social links (auto width)
  -->
  <div class="container mx-auto grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
    <!-- Left side: More Info button -->
    <div class="flex justify-start">
      <Button
        class={`${buttonVariants({ variant: "outline" })} text-muted-foreground`}
        aria-label="Show more info"
        onclick={onMoreInfo}
      >
        More Info
      </Button>
    </div>

    <!-- Center: Quote of the Day -->
    <div class="flex justify-center">
      <QuoteOfTheDay />
    </div>

    <!-- Right side: Social links -->
    <div class="flex justify-end">
      <SocialLinks />
    </div>
  </div>
</footer>
