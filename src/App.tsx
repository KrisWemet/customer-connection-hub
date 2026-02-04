import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import ClientPortal from "./pages/ClientPortal";
import ClientPayments from "./pages/ClientPayments";
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
// Multi-day pages temporarily removed
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Note: Error handling is now done at the component level using the error state
// from useQuery/useMutation hooks, or using error boundaries.

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ErrorBoundary>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/contract/sign/:contractId" element={<ContractSign />} />
              <Route path="/contract/success/:contractId" element={<ContractSuccess />} />

              {/* Admin protected routes */}
              <Route path="/" element={
                <ProtectedRoute requiredRole="admin">
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/leads" element={
                <ProtectedRoute requiredRole="admin">
                  <Leads />
                </ProtectedRoute>
              } />
              <Route path="/leads/:id" element={
                <ProtectedRoute requiredRole="admin">
                  <LeadDetail />
                </ProtectedRoute>
              } />
              <Route path="/tours" element={
                <ProtectedRoute requiredRole="admin">
                  <Tours />
                </ProtectedRoute>
              } />
              <Route path="/events" element={
                <ProtectedRoute requiredRole="admin">
                  <Bookings />
                </ProtectedRoute>
              } />
              <Route path="/bookings/:id" element={
                <ProtectedRoute requiredRole="admin">
                  <BookingDetail />
                </ProtectedRoute>
              } />
              <Route path="/calendars" element={
                <ProtectedRoute requiredRole="admin">
                  <Calendars />
                </ProtectedRoute>
              } />
              <Route path="/contacts" element={
                <ProtectedRoute requiredRole="admin">
                  <Contacts />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute requiredRole="admin">
                  <Messages />
                </ProtectedRoute>
              } />
              <Route path="/proposals" element={
                <ProtectedRoute requiredRole="admin">
                  <Proposals />
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute requiredRole="admin">
                  <Invoices />
                </ProtectedRoute>
              } />
              <Route path="/contracts" element={
                <ProtectedRoute requiredRole="admin">
                  <Contracts />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredRole="admin">
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/templates" element={
                <ProtectedRoute requiredRole="admin">
                  <Templates />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminSettings />
                </ProtectedRoute>
              } />
              <Route path="/damage-deposits" element={
                <ProtectedRoute requiredRole="admin">
                  <DamageDeposits />
                </ProtectedRoute>
              } />

              {/* Multi-day event routes temporarily removed */}

              {/* Client protected routes */}
              <Route path="/portal" element={
                <ProtectedRoute requiredRole="client">
                  <ClientPortal />
                </ProtectedRoute>
              } />
              <Route path="/portal/payments" element={
                <ProtectedRoute requiredRole="client">
                  <ClientPayments />
                </ProtectedRoute>
              } />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
