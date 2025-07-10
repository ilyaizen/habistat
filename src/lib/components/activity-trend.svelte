<script lang="ts">
  import { BarChart } from "layerchart";
  import * as Chart from "$lib/components/ui/chart";

  type TrendData = {
    date: string;
    completions: number;
    label: string;
  };

  let { data = $bindable(), title = "Activity Trend" }: { data: TrendData[]; title?: string } =
    $props();

  const chartConfig = {
    completions: {
      label: "Completions",
      color: "var(--chart-1)"
    }
  } satisfies Chart.ChartConfig;

  const filteredData = $derived.by(() => {
    const firstNonZeroIndex = data.findIndex((d) => d.completions > 0);
    if (firstNonZeroIndex === -1) {
      // If all are zero, show nothing to avoid the empty state message
      return [];
    }
    return data.slice(firstNonZeroIndex);
  });
</script>

<div class="space-y-2">
  <span class="text-muted-foreground pb-2 text-xs font-medium"
    >{title} (Last {filteredData.length} Days)</span
  >

  {#if filteredData.length === 0}
    <div class="text-muted-foreground flex h-[150px] items-center justify-center text-sm">
      No activity data available
    </div>
  {:else}
    <div class="h-[150px]">
      <Chart.Container config={chartConfig} class="h-full w-full">
        <BarChart
          data={filteredData}
          x="label"
          y="completions"
          yNice
          props={{
            bars: {
              fill: "var(--color-chart-1)",
              stroke: "none"
            },
            xAxis: {
              ticks: [],
              tickMarks: false
            }
          }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip />
          {/snippet}
        </BarChart>
      </Chart.Container>
    </div>
  {/if}
</div>
