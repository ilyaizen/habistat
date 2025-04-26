<script lang="ts">
  import SignIn from "clerk-sveltekit/client/SignIn.svelte";
</script>

<div class="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
  <SignIn redirectUrl="/dashboard" />
</div>
