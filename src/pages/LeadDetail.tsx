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
import { Link, useParams } from "react-router-dom";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
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

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Inquiry Overview</h2>
          <p className="text-sm text-muted-foreground">
            {inquiry?.full_name ?? "Inquiry"} • {inquiry?.email ?? "No email"} • {inquiry?.phone ?? "No phone"}
          </p>
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
