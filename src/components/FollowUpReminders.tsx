import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Clock, Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

interface FollowUpReminder {
  id: string;
  inquiry_id: string;
  booking_id?: string;
  reminder_type: "no_contact" | "tour_followup" | "proposal_followup" | "contract_reminder" | "custom";
  message: string;
  due_at: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  inquiry?: {
    full_name: string;
    email: string;
    status: string;
  };
}

function formatDueTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 0) return { text: `${Math.abs(diffHours)}h overdue`, urgent: true };
  if (diffHours < 1) return { text: "Due now", urgent: true };
  if (diffHours < 24) return { text: `Due in ${diffHours}h`, urgent: true };
  if (diffDays === 1) return { text: "Due tomorrow", urgent: false };
  return { text: `Due in ${diffDays} days`, urgent: false };
}

function getReminderIcon(type: string) {
  switch (type) {
    case "no_contact":
      return <Bell size={16} />;
    case "tour_followup":
      return <Calendar size={16} />;
    case "proposal_followup":
      return <Clock size={16} />;
    case "contract_reminder":
      return <AlertCircle size={16} />;
    default:
      return <Bell size={16} />;
  }
}

interface FollowUpRemindersListProps {
  limit?: number;
  showCompleted?: boolean;
}

export function FollowUpRemindersList({ limit = 10, showCompleted = false }: FollowUpRemindersListProps) {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["follow_up_reminders", showCompleted],
    enabled: supabaseConfigured,
    queryFn: async () => {
      let query = supabase
        .from("follow_up_reminders")
        .select(`
          *,
          inquiry:inquiry_id (full_name, email, status)
        `)
        .order("due_at", { ascending: true });

      if (!showCompleted) {
        query = query.eq("is_completed", false);
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;
      return (data ?? []) as FollowUpReminder[];
    },
  });

  const completeReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_up_reminders")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_up_reminders"] });
      toast.success("Reminder marked complete");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to complete reminder");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
        <p className="text-sm text-muted-foreground">
          {showCompleted ? "No reminders" : "All caught up! No pending follow-ups."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => {
        const due = formatDueTime(reminder.due_at);
        const isOverdue = due.text.includes("overdue");

        return (
          <div
            key={reminder.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-colors",
              reminder.is_completed
                ? "border-border/50 bg-muted/30 opacity-60"
                : isOverdue
                ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                : due.urgent
                ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                : "border-border bg-background"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                reminder.is_completed
                  ? "bg-emerald-100 text-emerald-600"
                  : isOverdue
                  ? "bg-red-100 text-red-600"
                  : due.urgent
                  ? "bg-amber-100 text-amber-600"
                  : "bg-blue-100 text-blue-600"
              )}
            >
              {reminder.is_completed ? <CheckCircle size={16} /> : getReminderIcon(reminder.reminder_type)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {reminder.inquiry?.full_name || "Unknown"}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {reminder.inquiry?.status?.replace("_", " ") || "inquiry"}
                </span>
              </div>

              <p className="mt-0.5 text-sm text-foreground">{reminder.message}</p>

              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs",
                    isOverdue ? "font-medium text-red-600" : "text-muted-foreground"
                  )}
                >
                  {due.text}
                </span>
                {!reminder.is_completed && (
                  <button
                    onClick={() => completeReminder.mutate(reminder.id)}
                    disabled={completeReminder.isPending}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                  >
                    {completeReminder.isPending && completeReminder.variables === reminder.id ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <CheckCircle size={10} />
                    )}
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Dashboard widget showing overdue/urgent reminders count
export function FollowUpBadge() {
  const { data: count = 0 } = useQuery({
    queryKey: ["follow_up_reminders_count"],
    enabled: supabaseConfigured,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("follow_up_reminders")
        .select("*", { count: "exact", head: true })
        .eq("is_completed", false)
        .lt("due_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()); // Due within 24h

      if (error) throw error;
      return count ?? 0;
    },
  });

  if (count === 0) return null;

  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
