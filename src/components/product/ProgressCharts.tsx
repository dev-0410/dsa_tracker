"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SeriesPoint = { date: string; attempted: number; solved: number; minutes: number };
type DifficultyPoint = { difficulty: string; attempted: number; solved: number };

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--line))",
  borderRadius: 10,
  color: "rgb(var(--ink))",
  fontSize: 12,
};

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function SolveTrendChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="solveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3157D5" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#3157D5" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => shortDate(String(label))} />
        <Area type="monotone" dataKey="solved" name="Solved" stroke="#3157D5" strokeWidth={2.5} fill="url(#solveFill)" activeDot={{ r: 4, fill: "#C7F269", stroke: "#16201A" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DifficultyProgressChart({ data }: { data: DifficultyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barGap={6}>
        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="difficulty" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="attempted" name="Attempted" fill="rgb(var(--line))" radius={[5, 5, 0, 0]} />
        <Bar dataKey="solved" name="Solved" fill="#C7F269" stroke="#7E9F2D" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
