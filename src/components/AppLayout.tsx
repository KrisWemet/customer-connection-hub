import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { NetworkStatus } from "./NetworkStatus";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar rounded-lg shadow-lg text-sidebar-foreground"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "lg:block",
          mobileMenuOpen ? "block" : "hidden"
        )}
      >
        <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="lg:ml-60 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>

      {/* Network Status Indicator */}
      <NetworkStatus />
    </div>
  );
}
