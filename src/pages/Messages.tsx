import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { getMessages, getThreads, markAsRead, sendMessage, sendTestEmail, sendTestSms } from "@/lib/messaging/service";
import { toast } from "@/components/ui/sonner";

type Thread = Awaited<ReturnType<typeof getThreads>>[number];

type PreviewMessage = {
  thread_id: string;
  body: string | null;
  channel: "sms" | "email" | "facebook_messenger" | null;
  created_at: string | null;
  direction: "inbound" | "outbound" | null;
};

type ContactRow = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_type?: "client" | "vendor" | "lead" | null;
  role?: string | null;
  booking_id?: string | null;
};

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

function getContactName(contact?: ContactRow | null) {
  return contact?.name || contact?.full_name || "Unknown contact";
}

function getContactMeta(contact?: ContactRow | null) {
  const email = contact?.email;
  const phone = contact?.phone;
  if (email && phone) return `${email} • ${phone}`;
  return email ?? phone ?? "No contact details";
}

function contactSegment(contact?: ContactRow | null) {
  const raw = (contact?.contact_type || contact?.role || "").toString().toLowerCase();
  if (raw.includes("vendor")) return "vendors";
  if (raw.includes("client") || raw.includes("couple")) return "clients";
  if (raw.includes("lead")) return "leads";
  return "clients";
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "";
  const target = new Date(value);
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return "yesterday";
  return target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<"list" | "conversation" | "compose">("list");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "clients" | "vendors" | "leads">("all");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toContactId, setToContactId] = useState("");
  const [testPhone, setTestPhone] = useState(import.meta.env.VITE_TEST_PHONE ?? "");
  const [testEmail, setTestEmail] = useState(import.meta.env.VITE_TEST_EMAIL ?? "");
  const [testSubject, setTestSubject] = useState("Test message from Customer Connection Hub");
  const [testBody, setTestBody] = useState("This is a test message from Customer Connection Hub.");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["message_threads"],
    queryFn: async () => {
      if (!supabaseConfigured) return [];
      return getThreads();
    },
    refetchInterval: 15000,
  });

  const threadIds = useMemo(() => threads.map((thread) => thread.id), [threads]);

  const { data: previews = {} } = useQuery({
    queryKey: ["message_previews", threadIds],
    enabled: supabaseConfigured && threadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("thread_id, body, channel, created_at, direction")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, PreviewMessage> = {};
      for (const row of data ?? []) {
        if (!map[row.thread_id]) {
          map[row.thread_id] = row as PreviewMessage;
        }
      }
      return map;
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", selectedThreadId],
    enabled: Boolean(selectedThreadId) && supabaseConfigured,
    queryFn: () => getMessages(selectedThreadId as string),
    refetchInterval: 12000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as ContactRow[];
      const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (threadId: string) => markAsRead(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message_threads"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const thread = threads.find((item) => item.id === selectedThreadId);
      const contactId = thread?.contact_id ?? toContactId;
      if (!contactId) throw new Error("Select a contact to send a message.");
      return sendMessage({
        contactId,
        channel,
        subject: channel === "email" ? subject : undefined,
        body,
      });
    },
    onSuccess: (msg) => {
      setBody("");
      setSubject("");
      if (!selectedThreadId) {
        setToContactId("");
      }
      if (!selectedThreadId && msg?.thread_id) {
        setSelectedThreadId(msg.thread_id);
        setActivePane("conversation");
      }
      queryClient.invalidateQueries({ queryKey: ["message_threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages", msg?.thread_id] });
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  const sendTestSmsMutation = useMutation({
    mutationFn: async () => {
      if (!testPhone.trim()) throw new Error("Enter a test phone number.");
      if (!testBody.trim()) throw new Error("Enter a test message.");
      return sendTestSms(testPhone.trim(), testBody.trim());
    },
    onSuccess: () => {
      toast.success("Test SMS sent");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Test SMS failed");
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      if (!testEmail.trim()) throw new Error("Enter a test email address.");
      return sendTestEmail(testEmail.trim(), testSubject.trim() || "Test message", testBody.trim());
    },
    onSuccess: () => {
      toast.success("Test email sent");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Test email failed");
    },
  });

  const selectedThread = threads.find((item) => item.id === selectedThreadId) ?? null;
  const selectedContact = selectedThread?.contacts as ContactRow | undefined;

  const filteredThreads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return threads
      .filter((thread) => {
        const contact = thread.contacts as ContactRow | undefined;
        if (filter !== "all" && contactSegment(contact) !== filter) return false;
        if (!normalizedSearch) return true;
        const haystack = [
          getContactName(contact),
          contact?.email,
          contact?.phone,
          contact?.role,
          contact?.contact_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const aDate = new Date(a.last_message_at ?? a.created_at ?? 0).getTime();
        const bDate = new Date(b.last_message_at ?? b.created_at ?? 0).getTime();
        return bDate - aDate;
      });
  }, [threads, search, filter]);

  useEffect(() => {
    if (selectedThreadId) {
      markReadMutation.mutate(selectedThreadId);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, selectedThreadId]);

  useEffect(() => {
    if (channel === "sms") {
      setSubject("");
    }
  }, [channel]);

  const smsCount = body.length;
  const smsOverLimit = channel === "sms" && smsCount > 160;
  const canSend =
    body.trim().length > 0 &&
    !smsOverLimit &&
    (selectedThreadId ? true : Boolean(toContactId)) &&
    supabaseConfigured &&
    !sendMutation.isPending;

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <div className="px-6 pt-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/" className="hover:text-primary">
              Home
            </a>
            <span>//</span>
            <span>Messages</span>
          </div>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-primary">Messages</h1>
          </div>
          <SupabaseNotice title="Supabase not configured for messages." />
          <div className="mt-4 hidden rounded-2xl border border-border bg-card p-4 shadow-card lg:block">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Messaging health</h2>
              <span className={cn("text-xs font-semibold", supabaseConfigured ? "text-emerald-600" : "text-destructive")}>
                {supabaseConfigured ? "Supabase connected" : "Supabase missing"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Test outbound delivery and confirm edge functions are reachable.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                className={inputClassName}
                placeholder="Test phone"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Test email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Email subject"
                value={testSubject}
                onChange={(event) => setTestSubject(event.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Message"
                value={testBody}
                onChange={(event) => setTestBody(event.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                onClick={() => sendTestSmsMutation.mutate()}
                disabled={!supabaseConfigured || sendTestSmsMutation.isPending}
              >
                {sendTestSmsMutation.isPending ? "Sending SMS..." : "Send test SMS"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground"
                onClick={() => sendTestEmailMutation.mutate()}
                disabled={!supabaseConfigured || sendTestEmailMutation.isPending}
              >
                {sendTestEmailMutation.isPending ? "Sending email..." : "Send test email"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-6 pb-8 lg:flex-row">
          <section className="w-full rounded-2xl border border-border bg-card p-4 shadow-card lg:hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Messaging health</h2>
              <span className={cn("text-xs font-semibold", supabaseConfigured ? "text-emerald-600" : "text-destructive")}>
                {supabaseConfigured ? "Supabase connected" : "Supabase missing"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Test outbound delivery and confirm edge functions are reachable.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                className={inputClassName}
                placeholder="Test phone"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Test email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Email subject"
                value={testSubject}
                onChange={(event) => setTestSubject(event.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Message"
                value={testBody}
                onChange={(event) => setTestBody(event.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                onClick={() => sendTestSmsMutation.mutate()}
                disabled={!supabaseConfigured || sendTestSmsMutation.isPending}
              >
                {sendTestSmsMutation.isPending ? "Sending SMS..." : "Send test SMS"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground"
                onClick={() => sendTestEmailMutation.mutate()}
                disabled={!supabaseConfigured || sendTestEmailMutation.isPending}
              >
                {sendTestEmailMutation.isPending ? "Sending email..." : "Send test email"}
              </button>
            </div>
          </section>

          {/* Column 1: Thread list */}
          <section
            className={cn(
              "flex w-full flex-col rounded-2xl border border-border bg-card shadow-card lg:w-[30%]",
              activePane !== "list" && "hidden lg:flex"
            )}
          >
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <input
                    className={inputClassName}
                    placeholder="Search threads"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={() => {
                    setSelectedThreadId(null);
                    setActivePane("compose");
                  }}
                >
                  New
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["all", "clients", "vendors", "leads"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                      filter === tab
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {threadsLoading ? (
                <div className="space-y-3 p-4 text-sm text-muted-foreground">Loading threads...</div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No threads found.</div>
              ) : (
                filteredThreads.map((thread) => {
                  const contact = thread.contacts as ContactRow | undefined;
                  const preview = previews[thread.id];
                  const channelIcon = preview?.channel === "email" ? "📧" : "💬";
                  const previewText = preview?.body || thread.subject || "No messages yet.";
                  const timestamp = formatRelativeTime(
                    preview?.created_at ?? thread.last_message_at ?? thread.created_at
                  );
                  const unreadCount = thread.unread_count ?? 0;
                  const isActive = thread.id === selectedThreadId;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        setActivePane("conversation");
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/10"
                          : "hover:border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="mt-1 text-lg">{channelIcon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {getContactName(contact)}
                          </span>
                          <span className="text-xs text-muted-foreground">{timestamp}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{previewText}</p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Column 2: Conversation */}
          <section
            className={cn(
              "flex w-full flex-1 flex-col rounded-2xl border border-border bg-card shadow-card lg:w-[45%]",
              activePane !== "conversation" && "hidden lg:flex"
            )}
          >
            <div className="border-b border-border p-4">
              {selectedThread ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground lg:hidden"
                        onClick={() => setActivePane("list")}
                      >
                        Back
                      </button>
                      <h2 className="text-lg font-semibold text-foreground">{getContactName(selectedContact)}</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">{getContactMeta(selectedContact)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selectedContact?.booking_id && (
                      <Link
                        to={`/bookings/${selectedContact.booking_id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View booking
                      </Link>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted-foreground lg:hidden"
                      onClick={() => setActivePane("compose")}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a conversation</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedThread ? (
                messagesLoading ? (
                  <div className="text-sm text-muted-foreground">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No messages yet.</div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const outbound = message.direction === "outbound";
                      const bubbleClasses = outbound
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted text-foreground";
                      return (
                        <div key={message.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm", bubbleClasses)}>
                            <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70">
                              {message.channel === "email" ? "Email" : "SMS"} •{" "}
                              {formatRelativeTime(message.sent_at ?? message.created_at)}
                            </div>
                            <p className="whitespace-pre-wrap">{message.body}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Select a conversation
                </div>
              )}
            </div>
          </section>

          {/* Column 3: Compose */}
          <section
            className={cn(
              "flex w-full flex-col rounded-2xl border border-border bg-card p-4 shadow-card lg:w-[25%]",
              activePane !== "compose" && "hidden lg:flex"
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedThread ? "Reply" : "New Message"}
              </h3>
              <button
                type="button"
                className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground lg:hidden"
                onClick={() => setActivePane(selectedThread ? "conversation" : "list")}
              >
                Back
              </button>
            </div>
            {!selectedThread && (
              <label className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                To
                <select
                  className={cn(inputClassName, "mt-2")}
                  value={toContactId}
                  onChange={(event) => setToContactId(event.target.value)}
                >
                  <option value="">Select a contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {getContactName(contact)} {contact.email ? `• ${contact.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel</p>
              <div className="mt-2 flex gap-3">
                {(["sms", "email"] as const).map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                      channel === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={value}
                      checked={channel === value}
                      onChange={() => setChannel(value)}
                      className="hidden"
                    />
                    {value === "sms" ? "SMS" : "Email"}
                  </label>
                ))}
              </div>
            </div>
            {channel === "email" && (
              <label className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Subject
                <input
                  className={cn(inputClassName, "mt-2")}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Subject"
                />
              </label>
            )}
            <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Message
              <textarea
                className={cn(inputClassName, "mt-2 min-h-[140px] resize-none")}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onInput={(event) => {
                  const target = event.currentTarget;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
                placeholder="Write your message..."
              />
            </label>
            {channel === "sms" && (
              <div className={cn("mt-2 text-xs", smsOverLimit ? "text-destructive" : "text-muted-foreground")}>
                {smsCount}/160 characters
              </div>
            )}
            <button
              type="button"
              className={cn(
                "mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity",
                canSend ? "bg-foreground text-background hover:opacity-90" : "bg-muted text-muted-foreground"
              )}
              onClick={() => sendMutation.mutate()}
              disabled={!canSend}
            >
              {sendMutation.isPending ? "Sending..." : "Send Message"}
            </button>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
