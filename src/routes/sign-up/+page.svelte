<script lang="ts">
  import SignUp from "clerk-sveltekit/client/SignUp.svelte";
  import type { Appearance } from "@clerk/types"; // Import the type if needed
  import { neobrutalism } from "@clerk/themes";

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
</script>

<div class="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
  <SignUp redirectUrl="/dashboard" appearance={clerkAppearance} />
</div>
