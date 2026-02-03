import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { BookingsSkeleton } from "@/components/BookingsSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { createBooking } from "@/lib/bookings/service";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { Tables } from "@/types/supabase";

const schema = z.object({
  client_name: z.string().min(1, "Required"),
  client_email: z.string().email("Invalid email"),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().min(1, "Required"),
  package_type: z.enum(["3_day_weekend", "5_day_extended", "10_day_experience"]),
  reception_guests: z.coerce.number().int().min(0, "Must be 0 or more"),
  camping_guests: z.coerce.number().int().min(0, "Must be 0 or more"),
  rv_sites: z.coerce.number().int().min(0, "Must be 0 or more"),
  upsell_rv: z.boolean().default(false),
  upsell_tent: z.boolean().default(false),
  upsell_firewood: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Bookings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: settings } = useQuery({
    queryKey: ["venue_settings"],
    queryFn: async () => {
      if (!supabaseConfigured) return null;
      const { data, error } = await supabase.from("venue_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: supabaseConfigured,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as Tables<"bookings">[];
      const { data, error } = await supabase.from("bookings").select("*").order("start_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: supabaseConfigured,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_name: "",
      client_email: "",
      start_date: "",
      end_date: "",
    package_type: "3_day_weekend",
      reception_guests: 0,
      camping_guests: 0,
      rv_sites: 0,
      upsell_rv: false,
      upsell_tent: false,
      upsell_firewood: false,
      notes: "",
    },
  });

  const upsellTotal = useMemo(() => {
    const priceMap = (settings?.upsell_unit_prices as Record<string, number>) ?? {};
    return (
      (form.watch("upsell_rv") ? priceMap.rv_site_overage ?? 0 : 0) +
      (form.watch("upsell_tent") ? priceMap.tent_camping_overage ?? 0 : 0) +
      (form.watch("upsell_firewood") ? priceMap.firewood_bundle ?? 0 : 0)
    );
  }, [form, settings]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const basePrice = Number(
        (settings?.package_base_prices as Record<string, number>)?.[values.package_type] ?? 0,
      );
      const payload = {
        package_type: values.package_type,
        start_date: values.start_date,
        end_date: values.end_date,
        base_price: basePrice,
        client_name: values.client_name,
        client_email: values.client_email,
        reception_guests: values.reception_guests,
        camping_guests: values.camping_guests,
        rv_sites: values.rv_sites,
        upsell_total: upsellTotal,
        notes: values.notes,
      };
      const result = await createBooking(payload);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({
        title: "Booking created",
        description: `Payment schedule: ${result.paymentSchedule.length} installment(s).`,
      });
      navigate(`/bookings/${result.booking.id}`);
    },
    onError: (error: any) => {
      const details = error?.details as string[] | undefined;
      if (details?.length) {
        details.forEach((msg) => form.setError("start_date", { message: msg }));
      }
      toast({
        title: "Unable to create booking",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <BookingsSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Bookings</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Bookings</h1>
            <p className="text-sm text-muted-foreground">Create new bookings and auto-generate payment schedules.</p>
          </div>
        </div>

        <SupabaseNotice title="Supabase not configured for bookings." />

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Add Booking</h2>
              <p className="text-sm text-muted-foreground">
                Package is fixed to 3-day weekend. Last-minute rule applies automatically.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Base package: ${Number((settings?.package_base_prices as any)?.["3_day_weekend"] ?? 0).toFixed(2)}
            </div>
          </div>

          <Form {...form}>
            <form
              className="mt-4 grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) => {
                if (!supabaseConfigured) {
                  toast({ title: "Supabase not configured", variant: "destructive" });
                  return;
                }
                mutation.mutate(values);
              })}
            >
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client name</FormLabel>
                    <FormControl>
                      <Input placeholder="Couple full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client email</FormLabel>
                    <FormControl>
                      <Input placeholder="couple@email.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date (Friday)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date (Sunday)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="package_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package</FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="3_day_weekend">
                          3-Day Weekend Package - ${Number((settings?.package_base_prices as any)?.["3_day_weekend"] ?? 4500)}
                        </option>
                        <option value="5_day_extended">
                          5-Day Extended Package - ${Number((settings?.package_base_prices as any)?.["5_day_extended"] ?? 5500)}
                        </option>
                        <option value="10_day_experience">
                          10-Day Experience Package - ${Number((settings?.package_base_prices as any)?.["10_day_experience"] ?? 8500)}
                        </option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reception_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reception guests</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="camping_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Camping guests</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rv_sites"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RV sites</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 rounded-lg border border-border/70 p-4 space-y-3">
                <div className="text-sm font-semibold">Upsells / Add-ons (overage)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <FormField
                    control={form.control}
                    name="upsell_rv"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div>
                          Additional RV site (${(settings?.upsell_unit_prices as any)?.rv_site_overage ?? 0}/night)
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="upsell_tent"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div>
                          Additional tent camping (${(settings?.upsell_unit_prices as any)?.tent_camping_overage ?? 0}/night)
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="upsell_firewood"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div>
                          Firewood bundle (${(settings?.upsell_unit_prices as any)?.firewood_bundle ?? 0}/bundle)
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Upsell total added to final installment: ${upsellTotal.toFixed(2)}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes / special requests</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Anything the team should know…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={mutation.isPending}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={mutation.isPending || !supabaseConfigured}>
                  {mutation.isPending ? "Creating..." : "Create booking"}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-lg font-semibold mb-3">Existing bookings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">End</th>
                  <th className="py-2 pr-3">Package</th>
                  <th className="py-2 pr-3">Base</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-border/60">
                    <td className="py-2 pr-3">{b.id}</td>
                    <td className="py-2 pr-3">{b.start_date}</td>
                    <td className="py-2 pr-3">{b.end_date}</td>
                    <td className="py-2 pr-3">{b.package_type}</td>
                    <td className="py-2 pr-3">${b.base_price.toFixed(2)}</td>
                    <td className="py-2 pr-3">{b.status}</td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-muted-foreground">
                      No bookings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
