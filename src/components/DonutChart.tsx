import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  title: string;
  count: number;
  subtitle: string;
  data: { name: string; value: number; color: string }[];
  items: { label: string; dotColor: string }[];
}

export function DonutChart({ title, count, subtitle, data, items }: DonutChartProps) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 animate-fade-in">
      <div className="flex items-baseline gap-3 mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <span className="text-2xl font-bold text-muted-foreground">{count}</span>
      </div>
      <p className="text-sm text-primary mb-4">{subtitle}</p>
      
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.dotColor }}
              />
              <span className="text-foreground">{item.label}</span>
            </div>
            <span className="text-primary text-xs hover:underline cursor-pointer">
              Quick View ▾
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
