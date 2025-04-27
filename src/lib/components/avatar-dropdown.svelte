<script lang="ts">
  import { Avatar, AvatarFallback } from "./ui/avatar";
  import * as DropdownMenu from "./ui/dropdown-menu";
  import { goto } from "$app/navigation";
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { UserResource } from "@clerk/types";
  import { browser } from "$app/environment";
  import { SignedIn, SignedOut, UserButton } from "svelte-clerk";
  import { Button } from "./ui/button";

  const user = getContext<Readable<UserResource | null>>("clerk-user");

  function goToSettings() {
    goto("/settings");
  }

  function goToDashboard() {
    goto("/dashboard");
  }

  function somethingElse() {
    console.log("Something else - Example custom item");
  }
</script>

<SignedIn>
  <UserButton afterSignOutUrl="/" showName={false} />
</SignedIn>

<SignedOut>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" onclick={() => goto("/sign-in")}>Sign In</Button>
    <Button variant="default" size="sm" onclick={() => goto("/sign-up")}>Sign Up</Button>
  </div>
</SignedOut>
