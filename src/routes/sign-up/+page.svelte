<script lang="ts">
  import { SignUp } from "svelte-clerk";
  import type { Appearance } from "@clerk/types";
  import { neobrutalism } from "@clerk/themes";
  import { onMount, getContext } from "svelte";
  import { goto } from "$app/navigation";
  import type { Readable } from "svelte/store";
  import type { UserResource } from "@clerk/types";

  const clerkAppearance: Appearance = {
    layout: {
      socialButtonsVariant: "iconButton",
      logoPlacement: "inside"
    },
    baseTheme: neobrutalism
  };

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
  <div class="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
    <SignUp redirectUrl="/dashboard" appearance={clerkAppearance} />
  </div>
{/if}
