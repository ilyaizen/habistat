<script lang="ts">
  import { SignIn } from "svelte-clerk";
  import { page } from "$app/stores";

  const lang = $page.params.lang;
</script>

<div class="container mx-auto flex min-h-screen items-center justify-center">
  <SignIn routing="path" path="/{lang}/sign-in" />
</div>
