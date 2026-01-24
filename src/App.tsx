import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";
import Bookings from "./pages/Bookings";
import Calendars from "./pages/Calendars";
import Contacts from "./pages/Contacts";
import Messages from "./pages/Messages";
import Tours from "./pages/Tours";
import ContractSign from "./pages/ContractSign";
import ContractSuccess from "./pages/ContractSuccess";
import Proposals from "./pages/Proposals";
import Invoices from "./pages/Invoices";
import Contracts from "./pages/Contracts";
import Reports from "./pages/Reports";
import Templates from "./pages/Templates";
import AdminSettings from "./pages/AdminSettings";
import LeadDetail from "./pages/LeadDetail";
import DamageDeposits from "./pages/DamageDeposits";
import BookingDetail from "./pages/BookingDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/tours" element={<Tours />} />
          <Route path="/events" element={<Bookings />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/calendars" element={<Calendars />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contract/sign/:contractId" element={<ContractSign />} />
          <Route path="/contract/success/:contractId" element={<ContractSuccess />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/damage-deposits" element={<DamageDeposits />} />
          <Route path="/portal" element={<ClientPortal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
