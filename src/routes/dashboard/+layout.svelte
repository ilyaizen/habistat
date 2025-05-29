<!-- Dashboard layout with shadcn sidebar -->
<script lang="ts">
  let { children } = $props();
</script>

<div class="flex">
  <!-- Main content area with proper layout -->
  <main class="bg-background flex-1 overflow-y-auto p-6">
    {@render children()}
    <!-- <div class="bg-card text-card-foreground rounded-lg border p-6 shadow-sm"></div> -->
  </main>
</div>
