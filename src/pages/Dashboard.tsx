import { AppLayout } from "@/components/AppLayout";
import { ActivityChart } from "@/components/ActivityChart";
import { DonutChart } from "@/components/DonutChart";
import {
  Calendar,
  AlertTriangle,
  Clock,
  RefreshCw,
  RotateCcw,
  Bell
} from "lucide-react";
import { StatusCard } from "@/components/StatusCard";
import { useDashboardStats } from "@/hooks/useDashboardData";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { FollowUpRemindersList } from "@/components/FollowUpReminders";
import { showError } from "@/lib/error-handler";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { stats, isLoading, error, upcomingBookings, overduePayments, pendingContracts, recentActivity } = useDashboardStats();

  // Show error toast if data fetch fails
  useEffect(() => {
    if (error) {
      showError(error, "Failed to load dashboard data");
    }
  }, [error]);

  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  // Calculate dynamic data for charts
  const upcomingData = [
    { name: "Upcoming Bookings", value: upcomingBookings.length, color: "#3B82F6" },
    { name: "Tours/Calls", value: 0, color: "#60A5FA" }, // TODO: Add tours table
    { name: "Payment Milestones", value: 0, color: "#93C5FD" }, // TODO: Calculate upcoming payments
    { name: "Checklist Items", value: 0, color: "#BFDBFE" }, // TODO: Add checklist table
    { name: "Vendor Documents", value: 0, color: "#DBEAFE" }, // TODO: Add documents table
  ];

  const overdueData = [
    { name: "Payments", value: overduePayments.length, color: "#EF4444" },
    { name: "Checklist Items", value: 0, color: "#F87171" }, // TODO: Add checklist table
  ];

  const waitingData = [
    { name: "Contract Signatures", value: pendingContracts.length, color: "#F59E0B" },
    { name: "Questionnaires", value: 0, color: "#FBBF24" }, // TODO: Add questionnaire table
    { name: "Vendor COIs", value: 0, color: "#FCD34D" }, // TODO: Add vendor COI tracking
  ];

  const totalUpcoming = upcomingData.reduce((sum, item) => sum + item.value, 0);
  const totalOverdue = overdueData.reduce((sum, item) => sum + item.value, 0);
  const totalWaiting = waitingData.reduce((sum, item) => sum + item.value, 0);
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
            count={totalUpcoming}
            subtitle="Next 60 days ▾"
            data={upcomingData.filter(item => item.value > 0)}
            items={upcomingData
              .filter(item => item.value > 0)
              .map(item => ({
                label: `${item.value} ${item.name}`,
                dotColor: item.color,
              }))}
          />
          <DonutChart
            title="Overdue"
            count={totalOverdue}
            subtitle="Last 180 days ▾"
            data={overdueData.filter(item => item.value > 0)}
            items={overdueData
              .filter(item => item.value > 0)
              .map(item => ({
                label: `${item.value} ${item.name}`,
                dotColor: item.color,
              }))}
          />
          <DonutChart
            title="Waiting"
            count={totalWaiting}
            subtitle="Last 180 days ▾"
            data={waitingData.filter(item => item.value > 0)}
            items={waitingData
              .filter(item => item.value > 0)
              .map(item => ({
                label: `${item.value} ${item.name}`,
                dotColor: item.color,
              }))}
          />
        </div>

        {/* Status Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatusCard
            title="Recent Activity"
            count={stats.recentActivity}
            icon={RotateCcw}
            color="gray"
            items={[
              { label: "NEW BOOKINGS", count: recentActivity.bookings.length },
              {
                label: `PAYMENTS RECEIVED (${overduePayments.length > 0 ? `$${overduePayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}` : '$0.00'})`,
                count: recentActivity.payments.length
              },
            ]}
          />
          <StatusCard
            title="Overdue"
            count={stats.overduePayments}
            icon={AlertTriangle}
            color="danger"
            items={overduePayments.slice(0, 4).map((payment, idx) => ({
              label: `${payment.label.toUpperCase()} ($${payment.amount.toFixed(2)})`,
              count: 1,
            }))}
          />
          <StatusCard
            title="Waiting"
            count={stats.pendingContracts}
            icon={Clock}
            color="warning"
            items={[
              { label: "CONTRACTS OUT FOR SIGNATURE", count: pendingContracts.length },
            ]}
          />
          <StatusCard
            title="Upcoming"
            count={stats.upcomingBookings}
            icon={Calendar}
            color="info"
            items={[
              { label: "EVENT WEEKENDS", count: upcomingBookings.length },
            ]}
          />
        </div>

        {/* Follow-up Reminders */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Follow-up Reminders</h2>
            </div>
          </div>
          <FollowUpRemindersList limit={5} />
        </div>
      </div>
    </AppLayout>
  );
}
