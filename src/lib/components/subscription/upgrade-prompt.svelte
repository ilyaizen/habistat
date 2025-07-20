<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";

  let {
    message,
    compact = false,
    showUpgradeButton = true,
    upgradeUrl = "/premium"
  }: {
    message: string;
    compact?: boolean;
    showUpgradeButton?: boolean;
    upgradeUrl?: string;
  } = $props();

  function handleUpgrade() {
    // Navigate to upgrade page (or external Stripe link in the future)
    window.location.href = upgradeUrl;
  }
</script>

{#if compact}
  <!-- Compact version for inline use -->
  <div class="bg-muted flex items-center gap-2 rounded-md p-2">
    <Badge variant="outline">Free Tier</Badge>
    <span class="text-muted-foreground flex-1 text-sm">{message}</span>
    {#if showUpgradeButton}
      <Button size="sm" variant="default" onclick={handleUpgrade}>Upgrade</Button>
    {/if}
  </div>
{:else}
  <!-- Full card version for standalone display -->
  <Card class="border-dashed">
    <CardHeader class="pb-4">
      <div class="flex items-center justify-between">
        <CardTitle class="text-lg">Upgrade to Premium</CardTitle>
        <Badge variant="outline">Free Tier</Badge>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <CardDescription class="text-base">
        {message}
      </CardDescription>

      {#if showUpgradeButton}
        <div class="flex gap-2">
          <Button onclick={handleUpgrade} class="flex-1">Upgrade to Premium</Button>
          <Button variant="outline" onclick={() => (window.location.href = "/premium")}>
            Learn More
          </Button>
        </div>
      {/if}
    </CardContent>
  </Card>
{/if}
