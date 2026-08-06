import { cn } from "@/components/ui";
import type { ActivityDay } from "./types";

interface ActivityHeatmapProps {
  data: ActivityDay[];
  title?: string;
  description?: string;
  maxWeeks?: number;
  className?: string;
}

const levelClasses: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "border-line bg-subtle",
  1: "border-[#D2E8A2] bg-[#E7F4C7] dark:border-[#43532D] dark:bg-[#2B361F]",
  2: "border-[#B8D86D] bg-[#CFF08B] dark:border-[#5D7530] dark:bg-[#435824]",
  3: "border-[#82A82B] bg-[#94C13C] dark:border-[#87AD36] dark:bg-[#6D9127]",
  4: "border-[#4F7010] bg-[#587D13] dark:border-[#C7F269] dark:bg-[#A4CF45]",
};

function getLevel(day: ActivityDay): 0 | 1 | 2 | 3 | 4 {
  if (day.level !== undefined) return day.level;
  if (day.count <= 0) return 0;
  if (day.count <= 1) return 1;
  if (day.count <= 3) return 2;
  if (day.count <= 5) return 3;
  return 4;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function ActivityHeatmap({
  data,
  title = "Practice activity",
  description = "Daily attempts over recent weeks",
  maxWeeks = 18,
  className,
}: ActivityHeatmapProps) {
  const safeWeeks = Math.max(4, Math.min(53, Math.round(maxWeeks)));
  const sortedData = [...data]
    .filter((day) => /^\d{4}-\d{2}-\d{2}/.test(day.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-(safeWeeks * 7));
  const firstDate = sortedData[0]?.date;
  const leadingDays = firstDate ? new Date(`${firstDate.slice(0, 10)}T00:00:00Z`).getUTCDay() : 0;
  const cells: Array<ActivityDay | null> = [
    ...Array.from<null>({ length: leadingDays }).fill(null),
    ...sortedData,
  ];
  const totalAttempts = sortedData.reduce((sum, day) => sum + Math.max(0, day.count), 0);
  const activeDays = sortedData.filter((day) => day.count > 0).length;

  return (
    <figure className={cn("rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6", className)}>
      <figcaption className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-[-0.02em] text-ink">{title}</h2>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">
          {activeDays} active days · {totalAttempts} attempts
        </p>
      </figcaption>

      {sortedData.length > 0 ? (
        <>
          <div className="mt-6 overflow-x-auto pb-2" aria-hidden="true">
            <div
              className="grid w-max grid-flow-col gap-1"
              style={{ gridTemplateRows: "repeat(7, 12px)", gridAutoColumns: "12px" }}
            >
              {cells.map((day, index) =>
                day ? (
                  <span
                    key={day.date}
                    title={`${formatDate(day.date)}: ${day.count} attempt${day.count === 1 ? "" : "s"}`}
                    className={cn("h-3 w-3 rounded-[3px] border", levelClasses[getLevel(day)])}
                  />
                ) : (
                  <span key={`empty-${index}`} className="h-3 w-3" />
                ),
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4 text-[10px] font-semibold text-muted">
            <span>Older</span>
            <div className="flex items-center gap-1.5" aria-label="Activity intensity legend">
              <span>Less</span>
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <span key={level} className={cn("h-3 w-3 rounded-[3px] border", levelClasses[level])} />
              ))}
              <span>More</span>
            </div>
            <span>Recent</span>
          </div>

          <ul className="sr-only">
            {sortedData.map((day) => (
              <li key={day.date}>
                {formatDate(day.date)}: {day.count} attempt{day.count === 1 ? "" : "s"}
                {day.solved !== undefined ? `, ${day.solved} solved` : ""}
                {day.minutes !== undefined ? `, ${day.minutes} minutes` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-subtle/50 px-5 py-8 text-center">
          <p className="text-sm font-bold text-ink">No practice activity yet</p>
          <p className="mt-1 text-xs text-muted">Your daily activity will appear here after the first attempt.</p>
        </div>
      )}
    </figure>
  );
}
