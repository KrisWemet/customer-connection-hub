import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import type { Tables } from "@/types/supabase";
import { Check, Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const cardClass = "rounded-2xl border border-border/60 bg-card p-6 shadow-card";
const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

type ChecklistItem = Tables<"checklist_items">;

const DEFAULT_CATEGORIES = [
  "Ceremony",
  "Attire",
  "Guests",
  "Catering",
  "Vendors",
  "Events",
  "Legal",
  "Travel",
  "Other",
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function getDaysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  const diff = date.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 3600 * 24));
  return days;
}

export default function ClientChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    due_date: "",
    category: "Other",
  });

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["client_booking", user?.email],
    enabled: supabaseConfigured && Boolean(user?.email),
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_date")
        .eq("client_email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["client_checklist", booking?.id],
    enabled: supabaseConfigured && Boolean(booking?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("booking_id", booking?.id ?? "")
        .order("sort_order", { ascending: true })
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistItem[];
    },
  });

  const createItem = useMutation({
    mutationFn: async () => {
      if (!booking?.id) throw new Error("No booking linked");
      const payload = {
        booking_id: booking.id,
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        due_date: formState.due_date || null,
        category: formState.category,
        is_completed: false,
      };
      const { error } = await supabase.from("checklist_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setFormState({
        title: "",
        description: "",
        due_date: "",
        category: "Other",
      });
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ["client_checklist", booking?.id] });
      toast.success("Task added");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add task");
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from("checklist_items")
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_checklist", booking?.id] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_checklist", booking?.id] });
      toast.success("Task removed");
    },
  });

  const isLoading = bookingLoading || itemsLoading;

  const filteredItems = items.filter((item) => {
    if (filter === "pending") return !item.is_completed;
    if (filter === "completed") return item.is_completed;
    return true;
  });

  const stats = {
    total: items.length,
    completed: items.filter((i) => i.is_completed).length,
    pending: items.filter((i) => !i.is_completed).length,
    overdue: items.filter((i) => {
      if (i.is_completed || !i.due_date) return false;
      return getDaysUntil(i.due_date)! < 0;
    }).length,
  };

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Group by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Planning Checklist
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Wedding planning tasks</h1>
            <p className="text-sm text-muted-foreground">
              Stay organized with your to-do list and track what&apos;s done.
            </p>
          </div>

          <SupabaseNotice title="Supabase not configured for checklist." />

          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : !booking ? (
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">No booking linked</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn&apos;t find a booking for {user?.email ?? "your account"}.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Total tasks</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{stats.total}</p>
                </div>
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">{progress}% done</p>
                </div>
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-500">{stats.pending}</p>
                </div>
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="mt-2 text-3xl font-semibold text-red-500">{stats.overdue}</p>
                  {stats.overdue > 0 && (
                    <p className="text-xs text-red-500">Needs attention</p>
                  )}
                </div>
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Your checklist</h2>
                  <div className="flex items-center gap-2">
                    <select
                      className={cn(inputClass, "w-auto")}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                    >
                      <option value="all">All tasks</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      {showAddForm ? "Cancel" : "Add task"}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {showAddForm && (
                  <div className="mt-4 rounded-xl border border-border/60 bg-background p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        className={cn(inputClass, "md:col-span-2")}
                        placeholder="Task title *"
                        value={formState.title}
                        onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="Description"
                        value={formState.description}
                        onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        type="date"
                        value={formState.due_date}
                        onChange={(e) => setFormState({ ...formState, due_date: e.target.value })}
                      />
                      <select
                        className={cn(inputClass, "md:col-span-2")}
                        value={formState.category}
                        onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                      >
                        {DEFAULT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => createItem.mutate()}
                        disabled={!formState.title.trim() || createItem.isPending}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {createItem.isPending ? "Adding..." : "Add task"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-6">
                  {filteredItems.length === 0 ? (
                    <p className="py-6 text-sm text-muted-foreground">
                      {filter === "completed"
                        ? "No completed tasks yet."
                        : filter === "pending"
                        ? "No pending tasks! You're all caught up."
                        : "No tasks yet. Add your first task above."}
                    </p>
                  ) : (
                    Object.entries(itemsByCategory).map(([category, catItems]) => (
                      <div key={category}>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {catItems.map((item) => {
                            const daysUntil = getDaysUntil(item.due_date);
                            const isOverdue = daysUntil !== null && daysUntil < 0 && !item.is_completed;

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-start gap-3 rounded-lg border border-border/40 bg-background p-3",
                                  item.is_completed && "opacity-60"
                                )}
                              >
                                <button
                                  onClick={() =>
                                    toggleComplete.mutate({ id: item.id, isCompleted: item.is_completed })
                                  }
                                  className={cn(
                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                    item.is_completed
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border hover:border-primary"
                                  )}
                                >
                                  {item.is_completed && <Check size={12} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={cn(
                                      "font-medium text-foreground",
                                      item.is_completed && "line-through"
                                    )}
                                  >
                                    {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                  )}
                                  {item.due_date && (
                                    <div
                                      className={cn(
                                        "mt-1 flex items-center gap-1 text-xs",
                                        isOverdue ? "text-red-500" : "text-muted-foreground"
                                      )}
                                    >
                                      <Calendar size={12} />
                                      {isOverdue ? (
                                        <span className="flex items-center gap-1">
                                          <AlertCircle size={12} />
                                          Overdue by {Math.abs(daysUntil)} days
                                        </span>
                                      ) : daysUntil === 0 ? (
                                        <span>Due today</span>
                                      ) : (
                                        <span>Due {formatDate(item.due_date)}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteItem.mutate(item.id)}
                                  className="text-muted-foreground hover:text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
