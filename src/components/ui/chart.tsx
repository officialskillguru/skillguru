// Chart wrapper — the one place recharts touches design tokens. Per the
// dataviz skill's method: categorical color is assigned in a FIXED slot
// order (--chart-1..8, validated against this app's real card surfaces —
// see globals.css and DESIGN_SYSTEM.md § Charts), never cycled or reassigned
// when a filtered series count changes. Status colors (success/warning/
// destructive) are reserved for state, never reused as a chart series color.
import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string } | { theme: Record<"light" | "dark", string> })
>;

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("Chart components must be used within <ChartContainer>");
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-dot]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

function resolveColor(itemConfig: ChartConfig[string], mode: "light" | "dark"): string | undefined {
  if ("theme" in itemConfig) return itemConfig.theme[mode];
  return itemConfig.color;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => "color" in cfg || "theme" in cfg);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: [
          `[data-chart=${id}] {`,
          ...colorConfig.map(([key, itemConfig]) => {
            const color = resolveColor(itemConfig, "light");
            return color ? `  --color-${key}: ${color};` : "";
          }),
          `}`,
          `.dark [data-chart=${id}] {`,
          ...colorConfig.map(([key, itemConfig]) => {
            const color = resolveColor(itemConfig, "dark");
            return color ? `  --color-${key}: ${color};` : "";
          }),
          `}`,
        ].join("\n"),
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipPayloadItem = { dataKey?: string | number; name?: string | number; value?: number | string; color?: string };

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: React.ReactNode;
    className?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    labelFormatter?: (value: React.ReactNode, payload: TooltipPayloadItem[]) => React.ReactNode;
  }
>(({ active, payload, className, hideLabel = false, hideIndicator = false, label, labelFormatter }, ref) => {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "grid min-w-[10rem] items-start gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg",
        className
      )}
    >
      {!hideLabel && label !== undefined && (
        <p className="font-bold text-foreground">{labelFormatter ? labelFormatter(label, payload) : label}</p>
      )}
      <div className="grid gap-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const itemConfig = config[key];
          const color = item.color;
          return (
            <div key={key} className="flex w-full items-center gap-2">
              {!hideIndicator && <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />}
              <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
              <span className="ml-auto font-mono font-bold tabular-nums text-foreground">
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { payload?: { value?: string; dataKey?: string; color?: string }[] }
>(({ className, payload }, ref) => {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div ref={ref} className={cn("flex flex-wrap items-center justify-center gap-4", className)}>
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? "");
        const itemConfig = config[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            <span className="text-xs font-semibold text-muted-foreground">{itemConfig?.label ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

// eslint-disable-next-line react-refresh/only-export-components -- shadcn/ui primitive: useChart ships alongside its components by upstream convention, not split into a separate file
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, useChart };
