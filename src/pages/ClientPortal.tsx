import { AppLayout } from "@/components/AppLayout";
import {
  CalendarCheck,
  CreditCard,
  FileText,
  File,
  Users,
  ListTodo,
  ClipboardList,
} from "lucide-react";

const quickActions = [
  {
    title: "Pay next deposit",
    subtitle: "Due in 14 days",
    href: "/payments",
    icon: CreditCard,
  },
  {
    title: "Review contract",
    subtitle: "Signature needed",
    href: "/contracts",
    icon: FileText,
  },
  {
    title: "Upload documents",
    subtitle: "Share your drafts",
    href: "/documents",
    icon: File,
  },
];

const sections = [
  {
    title: "Payments",
    description: "View your payment schedule and pay outstanding invoices.",
    href: "/payments",
    icon: CreditCard,
  },
  {
    title: "Contracts",
    description: "Review and sign agreements and waivers.",
    href: "/contracts",
    icon: FileText,
  },
  {
    title: "Documents",
    description: "Upload floor plans, timelines, and important files.",
    href: "/documents",
    icon: File,
  },
  {
    title: "Guest List",
    description: "Track RSVPs and guest counts in one place.",
    href: "/guests",
    icon: Users,
  },
  {
    title: "Weekend Timeline",
    description: "Build your ceremony and reception schedule.",
    href: "/timeline",
    icon: ListTodo,
  },
  {
    title: "Planning Checklist",
    description: "Stay on track with upcoming tasks.",
    href: "/checklist",
    icon: ClipboardList,
  },
];

export default function ClientPortal() {
  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="rounded-3xl border border-border/60 bg-card/90 p-8 shadow-card">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Rustic Retreat Wedding Portal
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
                  Welcome, Morgan + Taylor
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  September 19, 2026 · Weekend celebration
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-5 py-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarCheck size={18} />
                  <span className="font-semibold">Next milestone</span>
                </div>
                <p className="mt-1">Final guest count due Aug 20</p>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <a
                key={action.title}
                href={action.href}
                className="group rounded-2xl border border-border/60 bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-primary/10 p-2 text-primary">
                    <action.icon size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                  </div>
                </div>
              </a>
            ))}
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground">Your planning hub</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything you need for your wedding weekend, organized and easy to find.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sections.map((section) => (
                <a
                  key={section.title}
                  href={section.href}
                  className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background p-4 transition hover:border-primary/40"
                >
                  <span className="rounded-xl bg-muted p-2 text-muted-foreground">
                    <section.icon size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{section.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
