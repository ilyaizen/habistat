<script lang="ts">
  import { SignIn } from "svelte-clerk";
  import type { Appearance } from "@clerk/types";
  import { neobrutalism } from "@clerk/themes";
  import { onMount, getContext } from "svelte";
  import { goto } from "$app/navigation";
  import type { Readable } from "svelte/store";
  import type { UserResource } from "@clerk/types";

  // Define the appearance object (can be shared or customized per page)
  const clerkAppearance: Appearance = {
    // variables: {
    //   colorPrimary: "hsl(222.2 47.4% 11.2%)", // Example: Dark blue matching ShadCN default
    //   colorBackground: "hsl(0 0% 100%)", // White background
    //   borderRadius: "0.5rem" // Matches ShadCN's default border radius
    // },
    layout: {
      socialButtonsVariant: "iconButton",
      logoPlacement: "inside"
    },
    baseTheme: neobrutalism
    // Add more element-specific customizations here if needed
    // elements: { ... }
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
    <SignIn redirectUrl="/dashboard" appearance={clerkAppearance} />
  </div>
{/if}
