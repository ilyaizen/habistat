<script lang="ts">
  import SignUp from "clerk-sveltekit/client/SignUp.svelte";
</script>

<div class="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
  <SignUp redirectUrl="/admin" />
</div>
