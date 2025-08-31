<script lang="ts">
  import { THEMES, type ChartConfig } from "./chart-utils.js";

  let { id, config }: { id: string; config: ChartConfig } = $props();

  const colorConfig = $derived(
    config
      ? (Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color) as [
          string,
          ChartConfig[string]
        ][])
      : null
  );

  const themeContents = $derived.by(() => {
    if (!colorConfig || !colorConfig.length) return;

    const themeContents: string[] = [];
    for (let [_theme, prefix] of Object.entries(THEMES)) {
      let content = `${prefix} [data-chart=${id}] {\n`;
      const lines = colorConfig
        .map(([key, itemConfig]) => {
          const themeKey = _theme as keyof NonNullable<(typeof itemConfig)["theme"]>;
          const value = itemConfig.theme?.[themeKey] ?? itemConfig.color;
          return value ? `\t--color-${key}: ${value};` : null;
        })
        .filter((v): v is string => typeof v === "string");

      content += lines.join("\n") + "\n}";

      themeContents.push(content);
    }

    return themeContents.join("\n");
  });
</script>

{#if themeContents}
  {#key id}
    <svelte:element this={"style"}>
      {themeContents}
    </svelte:element>
  {/key}
{/if}
