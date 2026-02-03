import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import {
  cancelContract,
  createBookingFromInquiry,
  createContract,
  sendContract,
} from "@/lib/contracts/service";
import { generateContractHtml } from "@/lib/contracts/template";
import { sendMessage } from "@/lib/messaging/service";
import { Link, useParams } from "react-router-dom";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [autoSendContract, setAutoSendContract] = useState(true);
  const [formState, setFormState] = useState({
    packageType: "3_day_weekend",
    eventStartDate: "",
    eventEndDate: "",
    totalAmount: 0,
    depositAmount: 0,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });
  const [tourForm, setTourForm] = useState({
    tourDate: "",
    tourTime: "",
    staffAssigned: "",
    tourNotes: "",
  });

  const { data: inquiry } = useQuery({
    queryKey: ["inquiry", id],
    enabled: Boolean(id && supabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiries").select("*").eq("id", id as string).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", id],
    enabled: Boolean(id && supabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("inquiry_id", id as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return createContract({
        inquiryId: id ?? null,
        packageType: formState.packageType,
        eventStartDate: formState.eventStartDate,
        eventEndDate: formState.eventEndDate,
        totalAmount: Number(formState.totalAmount),
        depositAmount: Number(formState.depositAmount),
        clientName: formState.clientName || inquiry?.full_name || "",
        clientEmail: formState.clientEmail || inquiry?.email || "",
        clientPhone: formState.clientPhone || inquiry?.phone || null,
      });
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      if (autoSendContract && contract?.id) {
        sendMutation.mutate({ contractId: contract.id, method: "email" });
      }
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (args: { contractId: string; method: "email" | "sms" }) => {
      await sendContract(args.contractId, args.method);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (contractId: string) => cancelContract(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
    },
  });

  const markTourMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing inquiry id");
      const { error } = await supabase.from("inquiries").update({ status: "tour_scheduled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiry", id] });
    },
  });

  const scheduleTourMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing inquiry id");
      const payload = {
        inquiry_id: id,
        tour_date: tourForm.tourDate,
        tour_time: tourForm.tourTime,
        staff_assigned: tourForm.staffAssigned || null,
        tour_notes: tourForm.tourNotes || null,
        attendees: [],
        status: "scheduled",
      };
      const { data, error } = await supabase.from("tours").insert(payload).select("*").maybeSingle();
      if (error || !data) throw error ?? new Error("Failed to schedule tour");

      await supabase.from("inquiries").update({ status: "tour_scheduled" }).eq("id", id);

      const contactId = await ensureContact({
        name: formState.clientName || inquiry?.full_name || "",
        email: formState.clientEmail || inquiry?.email || "",
        phone: formState.clientPhone || inquiry?.phone || null,
      });

      const when = `${payload.tour_date} at ${payload.tour_time}`;
      const directions =
        "Directions to Rustic Retreat (3121 Township Rd 572A, Lac La Nonne):\nFrom Edmonton:\nHead west on Yellowhead Trail (Highway 16) toward St. Albert\nContinue ~60 km until Highway 43 junction\nTurn right (north) onto Highway 43 toward Whitecourt/Barrhead\nTurn right (north) onto Highway 33 toward Barrhead/Lac La Nonne\nContinue north on Highway 33 for 15-20 minutes\nTurn right (east) onto Township Road 572A\nDrive east for a couple kilometres - we're at #3121 on the right";
      const expectations =
        "What to Expect:\nYour tour will last approximately 60-90 minutes. We'll walk through the ceremony site, reception area, and guest accommodations. Feel free to bring family members who are helping with planning. Dress appropriately for the weather - tours happen rain or shine. For questions before your tour, contact Shannon at 780-210-6252. We're excited to show you Rustic Retreat!";

      await sendMessage({
        contactId,
        channel: "email",
        subject: "Your Rustic Retreat tour is scheduled",
        body: `Hi ${formState.clientName || inquiry?.full_name || "there"},\n\nYour tour is booked for ${when}.\n\n${directions}\n\n${expectations}\n\nIf you need to reschedule, just reply to this email.`,
      });

      return data;
    },
    onSuccess: () => {
      setTourForm({ tourDate: "", tourTime: "", staffAssigned: "", tourNotes: "" });
      queryClient.invalidateQueries({ queryKey: ["inquiry", id] });
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });

  async function ensureContact(args: { name: string; email: string; phone?: string | null }) {
    if (!args.email) {
      throw new Error("Missing client email for tour confirmation");
    }
    const { data: existing } = await supabase.from("contacts").select("id").eq("email", args.email).maybeSingle();
    if (existing?.id) return existing.id;

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        name: args.name || "Rustic Retreat Client",
        email: args.email,
        phone: args.phone ?? null,
        contact_type: "lead",
      })
      .select("id")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Unable to create contact");
    return data.id;
  }

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing inquiry id");
      return createBookingFromInquiry({
        inquiryId: id,
        packageType: formState.packageType,
        eventStartDate: formState.eventStartDate,
        eventEndDate: formState.eventEndDate,
        totalAmount: Number(formState.totalAmount),
        clientName: formState.clientName || inquiry?.full_name || "",
        clientEmail: formState.clientEmail || inquiry?.email || "",
        clientPhone: formState.clientPhone || inquiry?.phone || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiry", id] });
    },
  });

  const previewHtml = useMemo(() => {
    if (!showPreview) return "";
    return generateContractHtml({
      contractNumber: "DRAFT",
      createdAt: new Date().toISOString(),
      clientName: formState.clientName || inquiry?.full_name || "",
      clientEmail: formState.clientEmail || inquiry?.email || "",
      clientPhone: formState.clientPhone || inquiry?.phone || "",
      packageType: formState.packageType,
      eventStartDate: formState.eventStartDate || new Date().toISOString(),
      eventEndDate: formState.eventEndDate || new Date().toISOString(),
      totalAmount: Number(formState.totalAmount || 0),
      depositAmount: Number(formState.depositAmount || 0),
      gstRate: 0.05,
    });
  }, [showPreview, formState, inquiry]);

  const canCreate =
    supabaseConfigured &&
    Boolean(formState.eventStartDate && formState.eventEndDate) &&
    Number(formState.totalAmount) > 0 &&
    Number(formState.depositAmount) >= 0 &&
    Boolean((formState.clientName || inquiry?.full_name) && (formState.clientEmail || inquiry?.email));

  const canCreateBooking =
    supabaseConfigured &&
    Boolean(formState.eventStartDate && formState.eventEndDate) &&
    Number(formState.totalAmount) > 0 &&
    Boolean((formState.clientName || inquiry?.full_name) && (formState.clientEmail || inquiry?.email));

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span>//</span>
          <Link to="/leads" className="hover:text-primary">
            Inquiries
          </Link>
          <span>//</span>
          <span>Inquiry {id}</span>
        </div>

        <h1 className="text-3xl font-bold text-primary">Inquiry Details</h1>

        <SupabaseNotice title="Supabase not configured for inquiries." />

        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Inquiry Overview</h2>
            <p className="text-sm text-muted-foreground">
              {inquiry?.full_name ?? "Inquiry"} • {inquiry?.email ?? "No email"} • {inquiry?.phone ?? "No phone"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
              onClick={() => markTourMutation.mutate()}
              disabled={!supabaseConfigured || markTourMutation.isPending}
            >
              {markTourMutation.isPending ? "Updating..." : "Mark Tour Scheduled"}
            </button>
            {inquiry?.status && (
              <span className="text-xs text-muted-foreground">Status: {inquiry.status}</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Schedule Tour</h2>
            <p className="text-xs text-muted-foreground">Set a tour date/time and send a confirmation email.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tour Date
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                type="date"
                value={tourForm.tourDate}
                onChange={(event) => setTourForm({ ...tourForm, tourDate: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tour Time
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                type="time"
                value={tourForm.tourTime}
                onChange={(event) => setTourForm({ ...tourForm, tourTime: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Staff Assigned
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                placeholder="Chris / Shannon"
                value={tourForm.staffAssigned}
                onChange={(event) => setTourForm({ ...tourForm, staffAssigned: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tour Notes
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                placeholder="Special requests, accessibility, etc."
                value={tourForm.tourNotes}
                onChange={(event) => setTourForm({ ...tourForm, tourNotes: event.target.value })}
              />
            </label>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tourForm.tourDate && tourForm.tourTime && supabaseConfigured
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              onClick={() => scheduleTourMutation.mutate()}
              disabled={
                !tourForm.tourDate || !tourForm.tourTime || !supabaseConfigured || scheduleTourMutation.isPending
              }
            >
              {scheduleTourMutation.isPending ? "Scheduling..." : "Schedule Tour"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Contracts</h2>
              <p className="text-xs text-muted-foreground">Create, send, and manage contracts for this inquiry.</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
              onClick={() => setShowPreview((prev) => !prev)}
            >
              {showPreview ? "Hide Preview" : "Preview Contract"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Package Type
              <select
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={formState.packageType}
                onChange={(event) => setFormState({ ...formState, packageType: event.target.value })}
              >
                <option value="3_day_weekend">3 Day Weekend</option>
                <option value="5_day_extended">5 Day Extended</option>
                <option value="10_day_experience">10 Day Experience</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client Name
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={formState.clientName || inquiry?.full_name || ""}
                onChange={(event) => setFormState({ ...formState, clientName: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Event Start
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                type="date"
                value={formState.eventStartDate}
                onChange={(event) => setFormState({ ...formState, eventStartDate: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Event End
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                type="date"
                value={formState.eventEndDate}
                onChange={(event) => setFormState({ ...formState, eventEndDate: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Amount
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                type="number"
                value={formState.totalAmount}
                onChange={(event) => setFormState({ ...formState, totalAmount: Number(event.target.value) })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Deposit Amount
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                type="number"
                value={formState.depositAmount}
                onChange={(event) => setFormState({ ...formState, depositAmount: Number(event.target.value) })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client Email
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={formState.clientEmail || inquiry?.email || ""}
                onChange={(event) => setFormState({ ...formState, clientEmail: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client Phone
              <input
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={formState.clientPhone || inquiry?.phone || ""}
                onChange={(event) => setFormState({ ...formState, clientPhone: event.target.value })}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoSendContract}
                onChange={(event) => setAutoSendContract(event.target.checked)}
              />
              Auto-send contract email after creation
            </label>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                canCreate ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
              onClick={() => createMutation.mutate()}
              disabled={!canCreate || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Contract"}
            </button>
          </div>

          {showPreview && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}

          <div className="space-y-3">
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contracts yet.</p>
            ) : (
              contracts.map((contract: any) => (
                <div
                  key={contract.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{contract.contract_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: <span className="font-semibold">{contract.status}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <Link to={`/contract/sign/${contract.id}`} className="text-primary">
                      View
                    </Link>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1 text-muted-foreground"
                      onClick={() => sendMutation.mutate({ contractId: contract.id, method: "email" })}
                    >
                      Send Email
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1 text-muted-foreground"
                      onClick={() => sendMutation.mutate({ contractId: contract.id, method: "sms" })}
                    >
                      Send SMS
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1 text-destructive"
                      onClick={() => cancelMutation.mutate(contract.id)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Create Booking (Skip Contract)</h2>
          <p className="text-xs text-muted-foreground">
            Use this only if you want to bypass the contract and confirm a booking directly.
          </p>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              canCreateBooking ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            onClick={() => createBookingMutation.mutate()}
            disabled={!canCreateBooking || createBookingMutation.isPending}
          >
            {createBookingMutation.isPending ? "Creating booking..." : "Create Booking"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
