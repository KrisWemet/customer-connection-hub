import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface ModuleCardProps {
  title: string;
  count?: number;
  icon: LucideIcon;
  iconColor: string;
  href: string;
  badge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "info";
  };
}

const badgeStyles = {
  success: "bg-status-success text-white",
  warning: "bg-status-warning text-white",
  danger: "bg-status-danger text-white",
  info: "bg-status-info text-white",
};

export function ModuleCard({ title, count, icon: Icon, iconColor, href, badge }: ModuleCardProps) {
  return (
    <Link
      to={href}
      className="group bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 border border-border/50 animate-fade-in"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0", iconColor)}
        >
          <Icon size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            {count !== undefined && (
              <span className="text-muted-foreground text-sm">{count}</span>
            )}
          </div>
          <p className="text-sm text-primary mt-1 group-hover:underline">View →</p>
        </div>
      </div>
      {badge && (
        <div className="mt-3">
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", badgeStyles[badge.variant])}>
            {badge.text}
          </span>
        </div>
      )}
    </Link>
  );
}
