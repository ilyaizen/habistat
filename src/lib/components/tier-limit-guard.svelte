<script lang="ts">
  import type { Snippet } from "svelte";
  import { subscriptionStore } from "$lib/stores/subscription";
  import UpgradePrompt from "./upgrade-prompt.svelte";

  let {
    type,
    calendarId,
    children,
    showUpgradePrompt = true,
    upgradePromptCompact = true,
    disabled = false
  }: {
    type: "calendars" | "habits";
    calendarId?: string;
    children: Snippet;
    showUpgradePrompt?: boolean;
    upgradePromptCompact?: boolean;
    disabled?: boolean;
  } = $props();

  // Check if current user can create more items of this type
  const canCreate = $derived.by(() => {
    if (disabled) return false;
    return subscriptionStore.checkLimit(type, calendarId);
  });

  // Get contextual upgrade message
  const upgradeMessage = $derived.by(() => {
    return subscriptionStore.getUpgradeMessage(type);
  });

  // Check if subscription data is still loading
  const isLoading = subscriptionStore.isLoading();
</script>

{#if isLoading}
  <!-- Show loading state while subscription data loads -->
  <div class="pointer-events-none opacity-50">
    {@render children()}
  </div>
{:else if canCreate}
  <!-- Allow creation - render children normally -->
  {@render children()}
{:else}
  <!-- Limit reached - show upgrade prompt instead of children -->
  {#if showUpgradePrompt}
    <UpgradePrompt message={upgradeMessage} compact={upgradePromptCompact} />
  {:else}
    <!-- Just disable/hide the children without showing upgrade prompt -->
    <div class="pointer-events-none opacity-50" title="Upgrade to Premium for unlimited access">
      {@render children()}
    </div>
  {/if}
{/if}
