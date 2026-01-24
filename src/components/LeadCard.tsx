import { cn } from "@/lib/utils";
import { Star, Filter, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";

export interface LeadCardData {
  id: string;
  title: string;
  date: string;
  time: string;
  status: "open" | "hold";
  daysOld: number;
  daysInStep: number;
  contacts: string[];
  tags?: { label: string; color: string }[];
}

interface LeadCardProps {
  lead: LeadCardData;
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <Link
      to={`/leads/${lead.id}`}
      className="block bg-card rounded-lg border border-border/50 shadow-card p-4 mb-3 animate-fade-in hover:shadow-card-hover transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div className="mb-3">
        <h4 className="font-semibold text-foreground text-sm">{lead.title}</h4>
        <p className="text-xs text-muted-foreground">{lead.date}</p>
        <p className="text-xs text-muted-foreground">{lead.time}</p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            lead.status === "open"
              ? "bg-status-success-light text-status-success"
              : "bg-status-warning-light text-status-warning"
          )}
        >
          {lead.status === "open" ? "Open" : "Hold"}
        </span>
        <span
          className={cn(
            "w-3 h-3 rounded-full",
            lead.status === "open" ? "bg-status-success" : "bg-status-warning"
          )}
        />
      </div>

      <div className="space-y-1 text-xs text-muted-foreground mb-3">
        <div className="flex justify-between">
          <span>{lead.daysOld} days old</span>
          <span className="text-status-warning">⏱</span>
        </div>
        <div className="flex justify-between">
          <span>{lead.daysInStep} days in step</span>
          <span className="text-status-info">🔄</span>
        </div>
      </div>

      {lead.contacts.length > 0 && (
        <div className="mb-3">
          {lead.contacts.map((contact, idx) => (
            <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={12} className="text-status-warning" />
              <span>{contact}</span>
            </div>
          ))}
        </div>
      )}

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {lead.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex gap-2 text-muted-foreground">
          <Star size={14} />
          <Filter size={14} />
          <Plus size={14} />
        </div>
      </div>

      <span className="block text-xs text-primary hover:underline mt-2">
        View Pipeline History ▾
      </span>
    </Link>
  );
}
