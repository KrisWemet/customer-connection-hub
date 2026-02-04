import { AppLayout } from "@/components/AppLayout";
import { ExternalLink, Phone, Mail } from "lucide-react";

const vendors = [
  {
    name: "(Add vendor name)",
    category: "Catering",
    contact: "",
    phone: "",
    email: "",
    website: "",
    notes: "",
  },
];

export default function ClientVendors() {
  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Vendors
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Recommended vendors</h1>
            <p className="text-sm text-muted-foreground">
              A curated list of trusted professionals who know Rustic Retreat well.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">AGLC liquor permit</h2>
                <p className="text-sm text-muted-foreground">
                  If you plan to serve alcohol, youll need an AGLC permit.
                </p>
              </div>
              <a
                href="https://aglc.ca/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
              >
                Visit AGLC
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            {vendors.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-card">
                Vendor list coming soon.
              </div>
            ) : (
              vendors.map((vendor) => (
                <div key={vendor.name} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {vendor.category}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">{vendor.name}</h2>
                      {vendor.notes && <p className="mt-1 text-sm text-muted-foreground">{vendor.notes}</p>}
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {vendor.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.website && (
                        <a className="flex items-center gap-2 text-primary" href={vendor.website} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
