import { AppLayout } from "@/components/AppLayout";
import { ActivityChart } from "@/components/ActivityChart";
import { DonutChart } from "@/components/DonutChart";
import { 
  Calendar, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  RotateCcw
} from "lucide-react";
import { StatusCard } from "@/components/StatusCard";

const upcomingData = [
  { name: "Expiring Holds", value: 1, color: "#3B82F6" },
  { name: "Invoices", value: 1, color: "#60A5FA" },
  { name: "Scheduled Payments", value: 1, color: "#93C5FD" },
  { name: "Appointments", value: 3, color: "#BFDBFE" },
  { name: "To-Dos", value: 8, color: "#DBEAFE" },
];

const overdueData = [
  { name: "Invoices", value: 1, color: "#EF4444" },
  { name: "To-Dos", value: 5, color: "#F87171" },
];

const waitingData = [
  { name: "Contract Signatures", value: 1, color: "#F59E0B" },
  { name: "Proposal Signatures", value: 4, color: "#FBBF24" },
  { name: "BEO Signatures", value: 3, color: "#FCD34D" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">DENVER HOUSE</h1>
            <p className="text-muted-foreground tracking-widest text-sm">E V E N T S</p>
          </div>
          <button className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors">
            Set View Filters ▾
          </button>
        </div>

        {/* Activity Chart */}
        <div className="mb-8">
          <ActivityChart />
        </div>

        {/* Donut Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DonutChart
            title="Upcoming"
            count={28}
            subtitle="Next 60 days ▾"
            data={upcomingData}
            items={[
              { label: "1 Expiring Holds", dotColor: "#3B82F6" },
              { label: "1 Invoices", dotColor: "#60A5FA" },
              { label: "1 Invoice Scheduled Payments", dotColor: "#93C5FD" },
              { label: "3 Appointments", dotColor: "#BFDBFE" },
              { label: "8 To-Dos", dotColor: "#DBEAFE" },
            ]}
          />
          <DonutChart
            title="Overdue"
            count={6}
            subtitle="Last 180 days ▾"
            data={overdueData}
            items={[
              { label: "1 Invoices", dotColor: "#EF4444" },
              { label: "5 To-Dos", dotColor: "#F87171" },
            ]}
          />
          <DonutChart
            title="Waiting"
            count={8}
            subtitle="Last 180 days ▾"
            data={waitingData}
            items={[
              { label: "1 Contract Signatures", dotColor: "#F59E0B" },
              { label: "4 Proposal Signatures", dotColor: "#FBBF24" },
              { label: "3 BEO Signatures", dotColor: "#FCD34D" },
            ]}
          />
        </div>

        {/* Status Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatusCard
            title="Recent Activity"
            count={6}
            icon={RotateCcw}
            color="gray"
            items={[
              { label: "LEADS CAPTURED", count: 2 },
              { label: "INVOICE PAYMENTS ($1,275.50)", count: 1 },
              { label: "FORM RESPONSES RECEIVED", count: 2 },
              { label: "CONTRACT SIGNATURE COLLECTED", count: 1 },
            ]}
          />
          <StatusCard
            title="Overdue"
            count={6}
            icon={AlertTriangle}
            color="danger"
            items={[
              { label: "TO-DO'S OVERDUE", count: 2 },
              { label: "BUDGET PAYMENT ($4,564.25)", count: 1 },
              { label: "INVOICE PAYMENT ($308.00)", count: 1 },
              { label: "INVOICES ($3,449.75)", count: 2 },
            ]}
          />
          <StatusCard
            title="Waiting"
            count={6}
            icon={Clock}
            color="warning"
            items={[
              { label: "CONTRACTS WAITING FOR SIGNATURES", count: 2 },
              { label: "FORM WAITING FOR RESPONSE", count: 1 },
              { label: "LOGIN WAITING FOR SETUP", count: 1 },
              { label: "PROPOSAL WAITING FOR SIGNATURE", count: 2 },
            ]}
          />
          <StatusCard
            title="Upcoming"
            count={7}
            icon={Calendar}
            color="info"
            items={[
              { label: "EVENTS", count: 2 },
              { label: "APPOINTMENTS", count: 4 },
              { label: "INVOICE PAYMENT ($2,500.00)", count: 1 },
            ]}
          />
        </div>
      </div>
    </AppLayout>
  );
}
