<!-- Dashboard layout -->
<script lang="ts">
  let { children } = $props();
</script>

<div class="flex min-h-full flex-col">
  <!-- Main content area with proper layout -->
  <main class="bg-background flex-1">
    <div class="container mx-auto pt-8">
      {@render children()}
    </div>
  </main>
</div>
