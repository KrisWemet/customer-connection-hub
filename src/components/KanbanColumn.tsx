import { cn } from "@/lib/utils";
import { LeadCard, LeadCardData } from "./LeadCard";
import { Flag } from "lucide-react";

interface KanbanColumnProps {
  title: string;
  count: number;
  leads: LeadCardData[];
  onLeadClick?: (leadId: string) => void;
}

export function KanbanColumn({ title, count, leads, onLeadClick }: KanbanColumnProps) {
  return (
    <div className="bg-muted/50 rounded-xl flex-1 min-w-[280px] max-w-[400px] flex flex-col">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Flag size={16} className="text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
          <span className="text-muted-foreground text-sm">{count}</span>
        </div>
      </div>
      <div className="p-3 flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick?.(lead.id)} />
        ))}
      </div>
    </div>
  );
}
