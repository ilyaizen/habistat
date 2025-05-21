<script lang="ts">
  import { SignUp } from "svelte-clerk";
  import { getContext } from "svelte";
  import { goto } from "$app/navigation";
  import type { Readable } from "svelte/store";
  import type { UserResource } from "@clerk/types";

  // Get the user store from context
  const user = getContext<Readable<UserResource | null>>("clerk-user");

  // Redirect if user is already authenticated
  $effect(() => {
    if ($user) {
      goto("/dashboard", { replaceState: true });
    }
  });
</script>

{#if !$user}
  <div class="grid h-screen place-items-center">
    <div class="w-full max-w-md">
      <SignUp />
    </div>
  </div>
{/if}
