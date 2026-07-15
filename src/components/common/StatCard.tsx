import CountUpDefault from "react-countup";
import { createElement } from "react";
import type { CountUpProps } from "react-countup";
import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type IconComponent = ComponentType<{ className?: string }>;
type ForwardRefIcon = {
  $$typeof?: symbol;
  render?: IconComponent;
};
type StatIcon = LucideIcon | ForwardRefIcon;
type CountUpModule = {
  default: ComponentType<CountUpProps>;
};

const countUpDefault = CountUpDefault as ComponentType<CountUpProps> | CountUpModule;
const CountUp = "default" in countUpDefault ? countUpDefault.default : countUpDefault;

function resolveIcon(icon: StatIcon): IconComponent | undefined {
  if (typeof icon === "function") {
    return icon;
  }

  return icon.render;
}

function renderStatIcon(icon: StatIcon): ReactNode {
  const Icon = resolveIcon(icon);

  return Icon ? createElement(Icon, { className: "size-5" }) : null;
}

type StatCardProps = {
  value: number;
  suffix: string;
  label: string;
  icon: StatIcon;
  dark?: boolean;
};

export function StatCard({
  value,
  suffix,
  label,
  icon,
  dark = false,
}: Readonly<StatCardProps>) {
  return (
    <div className={dark ? "rounded-2xl border border-white/10 bg-white/[0.06] p-5" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"}>
      <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-[#00C2FF]/10 text-[#00A8E8]">
        {renderStatIcon(icon)}
      </div>
      <p className={dark ? "text-3xl font-black text-white" : "text-3xl font-black text-foreground"}>
        <CountUp end={value} duration={2} enableScrollSpy scrollSpyOnce />
        {suffix}
      </p>
      <p className={dark ? "mt-1 text-sm text-white/60" : "mt-1 text-sm text-muted-foreground"}>{label}</p>
    </div>
  );
}
