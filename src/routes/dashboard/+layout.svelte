<!-- Dashboard layout with shadcn sidebar -->
<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Home, Calendar, Settings, Search, BarChart } from "lucide-svelte";

  // Menu items for the sidebar
  const sidebarItems = [
    {
      title: "Overview",
      icon: Home,
      href: "/dashboard"
    },
    {
      title: "Statistics",
      icon: BarChart,
      href: "/dashboard/statistics"
    },
    {
      title: "Calendar",
      icon: Calendar,
      href: "/dashboard/calendar"
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings"
    }
  ];

  let { children } = $props();
</script>

<div class="relative flex overflow-hidden">
  <Sidebar.Provider class="-full">
    <Sidebar.Root variant="sidebar">
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Dashboard</Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each sidebarItems as item (item.title)}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton>
                    {#snippet child({ props })}
                      <a href={item.href} {...props}>
                        <!-- svelte-ignore svelte_component_deprecated -->
                        <svelte:component this={item.icon} />
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
    </Sidebar.Root>

    <main class="flex-1 overflow-y-auto">
      <div class="p-4">
        <Sidebar.Trigger class="mb-4" />
        {@render children()}
      </div>
    </main>
  </Sidebar.Provider>
</div>
