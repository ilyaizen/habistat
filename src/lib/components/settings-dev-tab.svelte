<script lang="ts">
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import Switch from "$lib/components/ui/switch/switch.svelte";

  let dummySetting1 = $state(false);
  let dummySetting2 = $state(true);
</script>

<Card>
  <CardHeader>
    <Label class="text-lg">Developer Settings</Label>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="flex items-center justify-between">
      <Label for="dummy-setting-1">Enable Awesome Feature</Label>
      <Switch id="dummy-setting-1" bind:checked={dummySetting1} />
    </div>
    <div class="flex items-center justify-between">
      <Label for="dummy-setting-2">Use Experimental API</Label>
      <Switch id="dummy-setting-2" bind:checked={dummySetting2} />
    </div>
    <div>
      <p class="text-sm text-gray-500">More dev settings will go here.</p>
    </div>
  </CardContent>
</Card>
