<script lang="ts">
  import { Avatar, AvatarFallback } from "./ui/avatar";
  import * as DropdownMenu from "./ui/dropdown-menu";
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Avatar class="border-border bg-muted h-8 w-8 border">
      <AvatarFallback class="text-muted-foreground text-xs font-bold">A</AvatarFallback>
    </Avatar>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-40 mx-4">
    <DropdownMenu.Item>Profile</DropdownMenu.Item>
    <DropdownMenu.Item>Notifications</DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item>Logout</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
