<script lang="ts">
  import { SignIn } from "svelte-clerk";
  import { getContext } from "svelte";
  import { goto } from "$app/navigation";
  import type { Readable } from "svelte/store";
  import type { UserResource } from "@clerk/types";
  import { get } from "svelte/store";

  // Get the user store from context
  const clerkUser = getContext<Readable<UserResource | null>>("clerk-user");

  // Redirect if user is already authenticated
  if (get(clerkUser)) {
    goto("/dashboard");
  }
</script>

{#if !$clerkUser}
  <div class="grid h-screen place-items-center">
    <div class="w-full max-w-md">
      <SignIn />
    </div>
  </div>
{/if}
