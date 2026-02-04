import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Calendar, Users, Mail, Phone, MapPin, CheckCircle, Loader2, MessageSquare, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { toast } from "@/components/ui/sonner";
import { ActivityTimeline } from "./ActivityTimeline";

type Inquiry = Tables<"inquiries">;
type InquiryStatus = Inquiry["status"];

const STATUS_FLOW: { status: InquiryStatus; label: string; color: string }[] = [
  { status: "inquiry", label: "New Inquiry", color: "bg-blue-500" },
  { status: "contacted", label: "Contacted", color: "bg-purple-500" },
  { status: "tour_scheduled", label: "Tour Scheduled", color: "bg-amber-500" },
  { status: "proposal_sent", label: "Proposal Sent", color: "bg-pink-500" },
  { status: "booked", label: "Booked", color: "bg-emerald-500" },
  { status: "completed", label: "Completed", color: "bg-teal-500" },
  { status: "declined", label: "Declined", color: "bg-red-500" },
  { status: "hold", label: "On Hold", color: "bg-gray-500" },
];

interface LeadDetailModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
}

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function LeadDetailModal({ inquiry, isOpen, onClose }: LeadDetailModalProps) {
  const queryClient = useQueryClient();
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [convertForm, setConvertForm] = useState({
    package_type: "3_day_weekend" as const,
    base_price: 5995,
    rv_sites: 5,
    estimated_day_guests: 100,
    estimated_overnight_guests: 50,
    special_requests: "",
  });

  const convertToBooking = useMutation({
    mutationFn: async () => {
      if (!inquiry) throw new Error("No inquiry selected");

      // Create the booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          package_type: convertForm.package_type,
          start_date: inquiry.event_start_date || new Date().toISOString().split("T")[0],
          end_date: inquiry.event_end_date || inquiry.event_start_date || new Date().toISOString().split("T")[0],
          base_price: convertForm.base_price,
          status: "confirmed",
          client_name: inquiry.full_name,
          client_email: inquiry.email,
          rv_sites: convertForm.rv_sites,
          estimated_day_guests: convertForm.estimated_day_guests,
          estimated_overnight_guests: convertForm.estimated_overnight_guests,
          special_requests: convertForm.special_requests || null,
          inquiry_id: inquiry.id,
        })
        .select("*")
        .single();

      if (bookingError) throw bookingError;

      // Update inquiry status to booked
      const { error: inquiryError } = await supabase
        .from("inquiries")
        .update({ status: "booked" })
        .eq("id", inquiry.id);

      if (inquiryError) throw inquiryError;

      // Create initial payment schedule (deposit)
      const depositAmount = Math.round(convertForm.base_price * 0.3 * 100) / 100;
      const finalPaymentAmount = convertForm.base_price - depositAmount;
      const eventDate = new Date(inquiry.event_start_date || new Date());
      const depositDueDate = new Date();
      depositDueDate.setDate(depositDueDate.getDate() + 14); // Due in 14 days
      const finalDueDate = new Date(eventDate);
      finalDueDate.setDate(finalDueDate.getDate() - 30); // Due 30 days before event

      const { error: paymentError } = await supabase.from("payment_schedule").insert([
        {
          booking_id: booking.id,
          installment_order: 1,
          label: "Deposit (30%)",
          amount: depositAmount,
          due_date: depositDueDate.toISOString().split("T")[0],
          status: "pending",
        },
        {
          booking_id: booking.id,
          installment_order: 2,
          label: "Final Payment",
          amount: finalPaymentAmount,
          due_date: finalDueDate.toISOString().split("T")[0],
          status: "pending",
        },
      ]);

      if (paymentError) throw paymentError;

      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Lead converted to booking successfully");
      setShowConvertForm(false);
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to convert lead");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: InquiryStatus) => {
      if (!inquiry) throw new Error("No inquiry selected");
      const { error } = await supabase
        .from("inquiries")
        .update({ status: newStatus })
        .eq("id", inquiry.id);
      if (error) throw error;

      // Log the status change in communication logs
      const { error: logError } = await supabase.from("communication_logs").insert({
        inquiry_id: inquiry.id,
        channel: "note",
        direction: "outbound",
        body: `Status updated to "${newStatus.replace("_", " ")}"`,
        status: "logged",
      });
      if (logError) console.error("Failed to log status change:", logError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["communication_logs", inquiry?.id] });
      toast.success("Status updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    },
  });

  if (!isOpen || !inquiry) return null;

  const isBooked = inquiry.status === "booked" || inquiry.status === "completed";
  const formattedDate = inquiry.event_start_date
    ? new Date(inquiry.event_start_date).toLocaleDateString("en-CA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date not set";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{inquiry.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1).replace("_", " ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Update */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Current Status</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    STATUS_FLOW.find(s => s.status === inquiry.status)?.color || "bg-gray-400"
                  )} />
                  <span className="font-semibold text-foreground capitalize">
                    {inquiry.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Move to:</span>
                {STATUS_FLOW.filter(s => s.status !== inquiry.status && s.status !== "booked" && s.status !== "completed").slice(0, 4).map((status) => (
                  <button
                    key={status.status}
                    onClick={() => updateStatus.mutate(status.status)}
                    disabled={updateStatus.isPending}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      "bg-background border border-border hover:bg-muted"
                    )}
                  >
                    {updateStatus.isPending && updateStatus.variables === status.status ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ArrowRight size={12} />
                    )}
                    {status.label}
                  </button>
                ))}

                {/* More status dropdown */}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      updateStatus.mutate(e.target.value as InquiryStatus);
                      e.target.value = "";
                    }
                  }}
                  disabled={updateStatus.isPending}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">More...</option>
                  {STATUS_FLOW.filter(s => s.status !== inquiry.status).map((status) => (
                    <option key={status.status} value={status.status}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pipeline Progress */}
            <div className="mt-4">
              <div className="flex items-center gap-1">
                {STATUS_FLOW.filter(s => !["declined", "hold"].includes(s.status)).map((status, idx, arr) => {
                  const isActive = status.status === inquiry.status;
                  const isPast = STATUS_FLOW.findIndex(s => s.status === inquiry.status) > STATUS_FLOW.findIndex(s => s.status === status.status);
                  const isBookedStatus = inquiry.status === "booked" || inquiry.status === "completed";

                  return (
                    <div key={status.status} className="flex items-center">
                      <div
                        className={cn(
                          "h-2 flex-1 rounded-full transition-all min-w-[40px]",
                          isActive ? status.color : isPast || (isBookedStatus && idx < arr.length - 1) ? "bg-emerald-500" : "bg-muted"
                        )}
                        title={status.label}
                      />
                      {idx < arr.length - 1 && (
                        <div className="w-1" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Inquiry</span>
                <span>Booked</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-3">
              <Mail size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{inquiry.email || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-3">
              <Phone size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground">{inquiry.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-3">
              <Calendar size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Event Date</p>
                <p className="text-sm font-medium text-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-3">
              <Users size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Guest Count</p>
                <p className="text-sm font-medium text-foreground">
                  {inquiry.estimated_guest_count || "Not estimated"}
                </p>
              </div>
            </div>
          </div>

          {/* Source & Notes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Source: {inquiry.source || "Unknown"}</span>
            </div>
            {inquiry.notes && (
              <div className="rounded-lg border border-border/50 bg-background p-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm text-foreground">{inquiry.notes}</p>
              </div>
            )}
          </div>

          {/* Convert to Booking */}
          {!isBooked && !showConvertForm && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Ready to book?</h3>
                  <p className="text-sm text-muted-foreground">
                    Convert this lead to a confirmed booking.
                  </p>
                </div>
                <button
                  onClick={() => setShowConvertForm(true)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Convert to Booking
                </button>
              </div>
            </div>
          )}

          {/* Conversion Form */}
          {showConvertForm && (
            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="mb-4 font-semibold text-foreground">Booking Details</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Package</label>
                  <select
                    className={inputClass}
                    value={convertForm.package_type}
                    onChange={(e) => {
                      const pkg = e.target.value as typeof convertForm.package_type;
                      const prices = {
                        "3_day_weekend": 5995,
                        "5_day_extended": 8995,
                        "10_day_experience": 14995,
                      };
                      setConvertForm({
                        ...convertForm,
                        package_type: pkg,
                        base_price: prices[pkg],
                      });
                    }}
                  >
                    <option value="3_day_weekend">3-Day Weekend ($5,995)</option>
                    <option value="5_day_extended">5-Day Extended ($8,995)</option>
                    <option value="10_day_experience">10-Day Experience ($14,995)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Base Price ($)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={convertForm.base_price}
                    onChange={(e) => setConvertForm({ ...convertForm, base_price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">RV Sites</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={convertForm.rv_sites}
                    onChange={(e) => setConvertForm({ ...convertForm, rv_sites: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Day Guests</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={convertForm.estimated_day_guests}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, estimated_day_guests: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Overnight Guests</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={convertForm.estimated_overnight_guests}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, estimated_overnight_guests: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Special Requests</label>
                  <textarea
                    className={cn(inputClass, "min-h-[80px] resize-y")}
                    value={convertForm.special_requests}
                    onChange={(e) => setConvertForm({ ...convertForm, special_requests: e.target.value })}
                    placeholder="Any special requirements or requests..."
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowConvertForm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => convertToBooking.mutate()}
                  disabled={convertToBooking.isPending}
                  className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {convertToBooking.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Already Booked Message */}
          {isBooked && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">Already Booked</h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    This lead has been converted to a booking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="rounded-xl border border-border bg-card p-4">
            <ActivityTimeline inquiryId={inquiry.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
