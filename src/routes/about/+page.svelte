<script lang="ts">
  // Import the MoreInfo component for standalone display
  import MoreInfo from "$lib/components/more-info.svelte";

  // Dummy handlers for required props
  // In the drawer, these are passed from parent, but here we provide minimal stubs
  let open = true; // Always open on this page
  function handleStart() {
    // Redirect or show onboarding if needed
    // For now, do nothing (could navigate elsewhere)
  }
</script>

<!--
  /about route: Standalone About/More Info page
  Renders the MoreInfo component outside of a drawer context.
-->
<div class="bg-background flex min-h-screen w-full flex-col items-center justify-center p-4">
  <!-- Render the MoreInfo component with required props -->
  <MoreInfo {open} {handleStart} showMoreInfoButton={false} />
</div>
