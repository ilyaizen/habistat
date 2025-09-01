<!-- Dashboard layout -->
<script lang="ts">
  let { children } = $props();
</script>

<div class="flex min-h-full flex-col">
  <!-- Main content area with proper layout -->
  <main class="bg-background flex-1">
    <div class="mx-auto max-w-3xl px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6 lg:px-8 lg:pt-8 lg:pb-8">
      {@render children()}
    </div>
  </main>
</div>
