<script lang="ts">
  import SessionInfo from "./session-info.svelte";
  import { onMount } from "svelte";
  import { Avatar, AvatarFallback } from "./ui/avatar";
  import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "./ui/dropdown-menu";
  import { anonymousUserId, createUserSession, initializeTracking } from "../utils/tracking";

  onMount(() => {
    initializeTracking();
    if (!$anonymousUserId) {
      createUserSession();
    }
  });
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar class="border-border bg-muted h-8 w-8 border">
      <AvatarFallback class="text-muted-foreground text-xs font-bold">A</AvatarFallback>
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent class="w-72 p-4">
    <SessionInfo userId={$anonymousUserId || undefined} />
  </DropdownMenuContent>
</DropdownMenu>
