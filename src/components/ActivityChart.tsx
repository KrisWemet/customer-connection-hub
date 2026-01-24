import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

const data = [
  { name: "Inquiries", value: 4, color: "#2196F3" },
  { name: "Tours", value: 3, color: "#4CAF50" },
  { name: "Contracts", value: 2, color: "#FF9800" },
  { name: "Payments", value: 2, color: "#9C27B0" },
  { name: "Documents", value: 5, color: "#607D8B" },
  { name: "Checklist", value: 9, color: "#00BCD4" },
  { name: "Guest RSVPs", value: 14, color: "#8BC34A" },
  { name: "RV Spots", value: 6, color: "#FF5722" },
  { name: "Messages", value: 7, color: "#E91E63" },
];

const legendItems = [
  { label: "4 Inquiries Captured", color: "#2196F3" },
  { label: "3 Tours Scheduled", color: "#4CAF50" },
  { label: "2 Contracts Sent", color: "#FF9800" },
  { label: "2 Payments Logged", color: "#9C27B0" },
  { label: "5 Documents Uploaded", color: "#607D8B" },
  { label: "9 Checklist Updates", color: "#00BCD4" },
  { label: "14 Guest RSVPs", color: "#8BC34A" },
  { label: "6 RV/Tent Spots Added", color: "#FF5722" },
  { label: "7 Messages", color: "#E91E63" },
];

export function ActivityChart() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-semibold text-sm">48</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Key Activities</h3>
          <p className="text-sm text-primary">Last 3 days ▾</p>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex-1 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="w-64 space-y-1.5">
          {legendItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-foreground">{item.label}</span>
            </div>
          ))}
          <button className="text-primary text-xs hover:underline mt-2">
            View Details ▾
          </button>
        </div>
      </div>
    </div>
  );
}
