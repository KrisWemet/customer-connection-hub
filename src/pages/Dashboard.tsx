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
  { name: "Upcoming Bookings", value: 2, color: "#3B82F6" },
  { name: "Tours/Calls", value: 3, color: "#60A5FA" },
  { name: "Payment Milestones", value: 2, color: "#93C5FD" },
  { name: "Checklist Items", value: 6, color: "#BFDBFE" },
  { name: "Vendor Documents", value: 4, color: "#DBEAFE" },
];

const overdueData = [
  { name: "Payments", value: 2, color: "#EF4444" },
  { name: "Checklist Items", value: 4, color: "#F87171" },
];

const waitingData = [
  { name: "Contract Signatures", value: 2, color: "#F59E0B" },
  { name: "Questionnaires", value: 3, color: "#FBBF24" },
  { name: "Vendor COIs", value: 2, color: "#FCD34D" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">RUSTIC RETREAT</h1>
            <p className="text-muted-foreground tracking-widest text-sm">W E D D I N G  V E N U E</p>
          </div>
          <button className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors">
            View Filters ▾
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
              { label: "2 Upcoming Bookings", dotColor: "#3B82F6" },
              { label: "3 Tours/Calls", dotColor: "#60A5FA" },
              { label: "2 Payment Milestones", dotColor: "#93C5FD" },
              { label: "6 Checklist Items", dotColor: "#BFDBFE" },
              { label: "4 Vendor Documents", dotColor: "#DBEAFE" },
            ]}
          />
          <DonutChart
            title="Overdue"
            count={6}
            subtitle="Last 180 days ▾"
            data={overdueData}
            items={[
              { label: "2 Payments", dotColor: "#EF4444" },
              { label: "4 Checklist Items", dotColor: "#F87171" },
            ]}
          />
          <DonutChart
            title="Waiting"
            count={8}
            subtitle="Last 180 days ▾"
            data={waitingData}
            items={[
              { label: "2 Contract Signatures", dotColor: "#F59E0B" },
              { label: "3 Questionnaires", dotColor: "#FBBF24" },
              { label: "2 Vendor COIs", dotColor: "#FCD34D" },
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
              { label: "INQUIRIES CAPTURED", count: 3 },
              { label: "PAYMENTS RECEIVED ($3,250.00)", count: 1 },
              { label: "PLANNING FORMS COMPLETED", count: 2 },
              { label: "CONTRACT SIGNED", count: 1 },
            ]}
          />
          <StatusCard
            title="Overdue"
            count={6}
            icon={AlertTriangle}
            color="danger"
            items={[
              { label: "CHECKLIST ITEMS OVERDUE", count: 3 },
              { label: "PAYMENT 2 ($4,250.00)", count: 1 },
              { label: "FINAL PAYMENT ($7,800.00)", count: 1 },
              { label: "VENDOR COI REQUESTS", count: 1 },
            ]}
          />
          <StatusCard
            title="Waiting"
            count={6}
            icon={Clock}
            color="warning"
            items={[
              { label: "CONTRACTS OUT FOR SIGNATURE", count: 2 },
              { label: "PLANNING QUESTIONNAIRE", count: 1 },
              { label: "PORTAL ACCOUNTS TO SET UP", count: 1 },
              { label: "HOLD REVIEW EXPIRING", count: 2 },
            ]}
          />
          <StatusCard
            title="Upcoming"
            count={7}
            icon={Calendar}
            color="info"
            items={[
              { label: "EVENT WEEKENDS", count: 2 },
              { label: "SITE TOURS", count: 4 },
              { label: "DEPOSIT DUE ($2,500.00)", count: 1 },
            ]}
          />
        </div>
      </div>
    </AppLayout>
  );
}
