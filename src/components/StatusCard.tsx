import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  color: "gray" | "danger" | "warning" | "info";
  items: { label: string; count: number }[];
}

const colorStyles = {
  gray: {
    header: "bg-muted-foreground",
    icon: "text-muted-foreground",
    text: "text-muted-foreground"
  },
  danger: {
    header: "bg-status-danger",
    icon: "text-status-danger",
    text: "text-status-danger"
  },
  warning: {
    header: "bg-status-warning",
    icon: "text-status-warning",
    text: "text-status-warning"
  },
  info: {
    header: "bg-status-info",
    icon: "text-status-info",
    text: "text-status-info"
  },
};

export function StatusCard({ title, count, icon: Icon, color, items }: StatusCardProps) {
  const styles = colorStyles[color];

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden animate-fade-in">
      <div className={cn("px-4 py-3 flex items-center gap-3", styles.header)}>
        <Icon size={20} className="text-white" />
        <span className="font-semibold text-white">
          {title.toUpperCase()} ({count})
        </span>
      </div>
      <div className="p-4 space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", styles.text)}>{item.count}</span>
              <span className="text-foreground">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
