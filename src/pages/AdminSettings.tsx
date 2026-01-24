import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { Tables } from "@/types/supabase";

const settingsSchema = z
  .object({
  business_name: z.string().min(1, "Required"),
  business_address: z.string().min(1, "Required"),
  base_price_3day: z.number().positive("Must be positive"),
  base_price_5day: z.number().positive("Must be positive"),
  base_price_10day: z.number().positive("Must be positive"),
  included_camping_guests: z.number().int().min(0),
  included_rv_sites: z.number().int().min(0),
  additional_rv_price: z.number().min(0),
  additional_tent_price: z.number().min(0),
  firewood_bundle_price: z.number().min(0),
  gst_rate_percent: z.number().min(0).max(20),
  deposit_percent: z.number().min(0).max(100),
  damage_deposit_amount: z.number().min(0),
  season_start: z.string().min(1),
  season_end: z.string().min(1),
})
  .refine((data) => new Date(data.season_start) <= new Date(data.season_end), {
    message: "Season start must be before end",
    path: ["season_start"],
  });

type SettingsFormValues = z.infer<typeof settingsSchema>;

const DEFAULTS: SettingsFormValues = {
  business_name: "Rustic Retreat Weddings and Events",
  business_address: "Lac Saint Anne County, Alberta, Canada",
  base_price_3day: 4500,
  base_price_5day: 5500,
  base_price_10day: 8500,
  included_camping_guests: 60,
  included_rv_sites: 15,
  additional_rv_price: 25,
  additional_tent_price: 15,
  firewood_bundle_price: 20,
  gst_rate_percent: 5,
  deposit_percent: 25,
  damage_deposit_amount: 500,
  season_start: "2026-06-01",
  season_end: "2026-09-30",
};

function mapSettingsToForm(row: Tables<"venue_settings"> | null): SettingsFormValues {
  if (!row) return DEFAULTS;
  const priceMap = row.package_base_prices as Record<string, number>;
  return {
    business_name: row.business_name,
    business_address: row.business_address,
    base_price_3day: Number(priceMap?.["3_day_weekend"] ?? DEFAULTS.base_price_3day),
    base_price_5day: Number(priceMap?.["5_day_extended"] ?? DEFAULTS.base_price_5day),
    base_price_10day: Number(priceMap?.["10_day_experience"] ?? DEFAULTS.base_price_10day),
    included_camping_guests: row.included_camping_guests ?? DEFAULTS.included_camping_guests,
    included_rv_sites: row.included_rv_sites ?? DEFAULTS.included_rv_sites,
    additional_rv_price: Number((row.upsell_unit_prices as Record<string, number>)?.rv_site_overage ?? DEFAULTS.additional_rv_price),
    additional_tent_price: Number(
      (row.upsell_unit_prices as Record<string, number>)?.tent_camping_overage ?? DEFAULTS.additional_tent_price,
    ),
    firewood_bundle_price: Number(
      (row.upsell_unit_prices as Record<string, number>)?.firewood_bundle ?? DEFAULTS.firewood_bundle_price,
    ),
    gst_rate_percent: Number(row.gst_rate ?? 0.05) * 100,
    deposit_percent: Number(row.deposit_percent ?? 0.25) * 100,
    damage_deposit_amount: Number(row.damage_deposit_amount ?? DEFAULTS.damage_deposit_amount),
    season_start: row.season_start ?? DEFAULTS.season_start,
    season_end: row.season_end ?? DEFAULTS.season_end,
  };
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settingsRow, isLoading } = useQuery({
    queryKey: ["venue_settings"],
    queryFn: async () => {
      if (!supabaseConfigured) return null;
      const { data, error } = await supabase.from("venue_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    form.reset(mapSettingsToForm(settingsRow ?? null));
  }, [settingsRow, form]);

  const mutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      if (!supabaseConfigured) throw new Error("Supabase not configured");
      const payload = {
        business_name: values.business_name,
        business_address: values.business_address,
        timezone: settingsRow?.timezone ?? "America/Edmonton",
        season_start: values.season_start,
        season_end: values.season_end,
        gst_rate: values.gst_rate_percent / 100,
        deposit_percent: values.deposit_percent / 100,
        included_camping_guests: values.included_camping_guests,
        included_rv_sites: values.included_rv_sites,
        max_reception_guests: settingsRow?.max_reception_guests ?? 150,
        package_base_prices: {
          "3_day_weekend": values.base_price_3day,
          "5_day_extended": values.base_price_5day,
          "10_day_experience": values.base_price_10day,
        },
        upsell_unit_prices: {
          rv_site_overage: values.additional_rv_price,
          tent_camping_overage: values.additional_tent_price,
          firewood_bundle: values.firewood_bundle_price,
        },
        payment_offsets: settingsRow?.payment_offsets ?? { deposit: 0, second: -90, final: -60 },
        damage_deposit_amount: values.damage_deposit_amount,
        damage_deposit_refund_days: settingsRow?.damage_deposit_refund_days ?? 7,
      };
      const { data: existing, error: fetchError } = await supabase.from("venue_settings").select("id").limit(1).maybeSingle();
      if (fetchError) throw fetchError;
      const targetId = existing?.id;
      const query = targetId
        ? supabase.from("venue_settings").update(payload).eq("id", targetId)
        : supabase.from("venue_settings").insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Venue settings updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["venue_settings"] });
    },
    onError: (error) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    },
  });

  const receptionCap = useMemo(() => settingsRow?.max_reception_guests ?? 150, [settingsRow]);
  const timezone = settingsRow?.timezone ?? "America/Edmonton";

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Admin</span>
          <span>//</span>
          <span>Settings</span>
        </div>
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin Settings</h1>
            <p className="text-sm text-muted-foreground">Manage venue settings for Rustic Retreat.</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => form.reset(mapSettingsToForm(settingsRow ?? null))}
              disabled={isLoading || mutation.isPending}
            >
              Reset to loaded
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset(DEFAULTS)}
              disabled={mutation.isPending}
            >
              Reset to defaults
            </Button>
            <Button type="button" onClick={form.handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {!supabaseConfigured && <SupabaseNotice title="Supabase not configured. Settings will not persist." />}

        <Form {...form}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Admin-only. Timezone is fixed to venue location.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="business_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rustic Retreat Weddings and Events" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Lac Saint Anne County, Alberta, Canada" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Timezone (display): {timezone}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Package Pricing (CAD)</CardTitle>
                <CardDescription>Base prices for all packages.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {[
                  { name: "base_price_3day", label: "3-Day Weekend (CAD)" },
                  { name: "base_price_5day", label: "5-Day Extended (CAD)" },
                  { name: "base_price_10day", label: "10-Day Experience (CAD)" },
                ].map((item) => (
                  <FormField
                    key={item.name}
                    control={form.control}
                    name={item.name as keyof SettingsFormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{item.label}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="50"
                            min="0"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <div className="flex items-end text-sm text-muted-foreground">Currency: CAD</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Included Capacity</CardTitle>
                <CardDescription>Included with the base package.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="included_camping_guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Camping guests included</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="included_rv_sites"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RV sites included</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col justify-end">
                  <div className="text-sm font-medium">Reception capacity (display)</div>
                  <div className="text-sm text-muted-foreground">{receptionCap} guests max</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overage Pricing (CAD)</CardTitle>
                <CardDescription>Applied beyond included counts.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="additional_rv_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional RV site ($/night)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additional_tent_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional tent camping ($/night)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firewood_bundle_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firewood bundle ($/bundle)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Settings</CardTitle>
                <CardDescription>GST, deposits, and payment cadence.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="gst_rate_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deposit_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial deposit (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="damage_deposit_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Damage deposit amount (CAD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="25"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-3 grid gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  <div>Payment schedule: 50% due at 90 days, final 25% at 60 days (deposit captured at booking).</div>
                  <div>Damage deposit refund window: within 7 days post-event.</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Season</CardTitle>
                <CardDescription>Only allow bookings inside the open season.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="season_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="season_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season end</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </Form>
      </div>
    </AppLayout>
  );
}
