import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  StickyNote, 
  Send, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

type CommunicationLog = Tables<"communication_logs">;

interface ActivityTimelineProps {
  inquiryId: string;
  bookingId?: string | null;
}

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case "email":
      return <Mail size={16} />;
    case "sms":
      return <MessageSquare size={16} />;
    case "note":
      return <StickyNote size={16} />;
    default:
      return <StickyNote size={16} />;
  }
}

function getChannelColor(channel: string) {
  switch (channel) {
    case "email":
      return "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400";
    case "sms":
      return "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400";
    case "note":
      return "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

export function ActivityTimeline({ inquiryId, bookingId }: ActivityTimelineProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteBody, setNoteBody] = useState("");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["communication_logs", inquiryId, bookingId],
    enabled: supabaseConfigured && (Boolean(inquiryId) || Boolean(bookingId)),
    queryFn: async () => {
      let query = supabase
        .from("communication_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (inquiryId) {
        query = query.eq("inquiry_id", inquiryId);
      } else if (bookingId) {
        query = query.eq("booking_id", bookingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CommunicationLog[];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const payload: Partial<CommunicationLog> = {
        inquiry_id: inquiryId || null,
        booking_id: bookingId || null,
        channel: "note",
        direction: "outbound",
        body: noteBody.trim(),
        status: "logged",
      };
      const { error } = await supabase.from("communication_logs").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteBody("");
      setShowAddNote(false);
      queryClient.invalidateQueries({ queryKey: ["communication_logs", inquiryId, bookingId] });
      toast.success("Note added");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add note");
    },
  });

  // Group activities by date
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = activity.created_at
      ? new Date(activity.created_at).toLocaleDateString("en-CA")
      : "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, CommunicationLog[]>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Activity Timeline</h3>
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
        >
          <StickyNote size={14} />
          {showAddNote ? "Cancel" : "Add Note"}
        </button>
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <div className="rounded-lg border border-border bg-background p-3">
          <textarea
            className={cn(inputClass, "min-h-[80px] resize-y")}
            placeholder="Write a note about this lead..."
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setShowAddNote(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => addNote.mutate()}
              disabled={!noteBody.trim() || addNote.isPending}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {addNote.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <StickyNote size={32} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Add notes, send emails, or make calls to track interactions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="relative">
              {/* Date header */}
              <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 bg-card py-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {date === new Date().toLocaleDateString("en-CA")
                    ? "Today"
                    : date === new Date(Date.now() - 86400000).toLocaleDateString("en-CA")
                    ? "Yesterday"
                    : new Date(date).toLocaleDateString("en-CA", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                </span>
                <div className="flex-1 border-t border-border/50" />
              </div>

              {/* Activities for this date */}
              <div className="space-y-3">
                {groupedActivities[date].map((activity) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex gap-3 rounded-lg border border-border/50 bg-background p-3",
                      activity.channel === "note" && "border-l-4 border-l-amber-400"
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        getChannelColor(activity.channel)
                      )}
                    >
                      {getChannelIcon(activity.channel)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium capitalize text-foreground">
                          {activity.channel}
                        </span>
                        {activity.direction && (
                          <span className="text-muted-foreground">
                            {activity.direction === "outbound" ? (
                              <ArrowRight size={12} />
                            ) : (
                              <ArrowLeft size={12} />
                            )}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.created_at)}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          {formatFullDate(activity.created_at)}
                        </span>
                      </div>

                      {activity.subject && (
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {activity.subject}
                        </p>
                      )}

                      {activity.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {activity.body}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                            activity.status === "sent"
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                              : activity.status === "failed"
                              ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {activity.status}
                        </span>
                        {activity.provider && (
                          <span className="text-[10px] text-muted-foreground">
                            via {activity.provider}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
