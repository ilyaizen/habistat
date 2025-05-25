<!-- Dashboard layout with shadcn sidebar -->
<script lang="ts">
  // import * as Sidebar from "$lib/components/ui/sidebar";
  // import { Home, Settings, BarChart, User, Info, MessageSquare } from "lucide-svelte";
  // import type { HTMLAnchorAttributes } from "svelte/elements";

  // Menu items for the sidebar
  // const topSidebarItems = [
  //   {
  //     title: "Home",
  //     icon: Home,
  //     href: "/"
  //   },
  //   {
  //     title: "Dashboard",
  //     icon: Home, // Assuming 'Home' icon for Dashboard Overview
  //     href: "/dashboard"
  //   },
  //   {
  //     title: "Stats",
  //     icon: BarChart,
  //     href: "/dashboard/statistics" // Assuming existing stats page
  //   },
  //   {
  //     title: "Settings",
  //     icon: Settings,
  //     href: "/settings"
  //   }
  // ];

  // const bottomSidebarItems = [
  //   {
  //     title: "More Info",
  //     icon: Info,
  //     href: "/more-info" // Placeholder href
  //   },
  //   {
  //     title: "Feedback",
  //     icon: MessageSquare,
  //     href: "/feedback" // Placeholder href
  //   }
  // ];

  let { children } = $props();
</script>

<div class="flex">
  <!-- Sidebar Provider wraps all sidebar components for context sharing -->
  <!-- <Sidebar.Provider class="flex w-60 flex-col justify-between">
    <Sidebar.Root>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each topSidebarItems as item (item.title)}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    {#snippet child({ props }: { props: HTMLAnchorAttributes })}
                      <a href={item.href} {...props}>
                        <item.icon class="h-5 w-5" />
                        <span>{item.title}</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/each}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
        <Sidebar.Group class="mt-auto">
          <Sidebar.GroupLabel>Support</Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each bottomSidebarItems as item (item.title)}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    {#snippet child({ props }: { props: HTMLAnchorAttributes })}
                      <a href={item.href} {...props}>
                        <item.icon class="h-5 w-5" />
                        <span>{item.title}</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/each}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer class="border-t p-4">
        <div class="flex items-center space-x-2">
          <User class="h-8 w-8 rounded-full bg-gray-300" />
          <span>Username</span>
        </div>
      </Sidebar.Footer>
    </Sidebar.Root>
  </Sidebar.Provider> -->

  <!-- Main content area with proper layout -->
  <main class="bg-background flex-1 overflow-y-auto p-6">
    <div class="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
      {@render children()}
    </div>
  </main>
</div>
