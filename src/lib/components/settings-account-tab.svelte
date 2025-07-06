<script lang="ts">
  import { Card, CardContent } from "$lib/components/ui/card";
  import SessionInfo from "$lib/components/session-info.svelte";
</script>

<!-- Account Information Section -->
<Card class="mb-6">
  <CardContent>
    <!-- Displays user session and authentication status -->
    <SessionInfo />
  </CardContent>
</Card>
