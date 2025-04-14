<script lang="ts">
  import { SignUp } from "svelte-clerk";
  import { page } from "$app/stores";

  const lang = $page.params.lang;
</script>

<div class="container mx-auto flex min-h-screen items-center justify-center">
  <SignUp routing="path" path="/{lang}/sign-up" />
</div>
