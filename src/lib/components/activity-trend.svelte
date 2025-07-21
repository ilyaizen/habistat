<script lang="ts">
  import { BarChart } from "layerchart";
  import * as Chart from "$lib/components/ui/chart";

  type TrendData = {
    date: string;
    completions: number;
    label: string;
  };

  let {
    data: filteredData = $bindable(),
    title = "Activity Trend",
  }: { data: TrendData[]; title?: string } = $props();

  const chartConfig = {
    completions: {
      label: "Completions",
      color: "var(--chart-1)",
    },
  } satisfies Chart.ChartConfig;
</script>

<div class="space-y-2">
  <span
    class="text-muted-foreground block w-full pb-4 text-right text-xs font-medium"
  >
    {title} - Last {filteredData.length} Days
  </span>

  {#if filteredData.length === 0}
    <div
      class="text-muted-foreground flex h-[300px] items-center justify-center text-sm"
    >
      No activity data available
    </div>
  {:else}
    <div class="mt-4 h-48">
      <!-- Changed height to h-48 (192px) for better visibility -->
      <Chart.Container config={chartConfig} class="h-full w-full">
        <BarChart
          data={filteredData}
          x="label"
          y="completions"
          yNice
          props={{
            bars: {
              fill: "var(--color-chart-1)",
              stroke: "none",
            },
            xAxis: {
              ticks: [],
              tickMarks: false,
            },
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
