import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui";

const queue = [
  { title: "Merge Intervals", note: "Review due", tag: "Intervals", state: "02" },
  { title: "Course Schedule", note: "Stretch problem", tag: "Graphs", state: "03" },
];

export function RecommendationPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:mx-0" aria-label="Preview of an adaptive daily problem queue">
      <div aria-hidden="true" className="absolute -left-4 top-14 h-[76%] w-4 rounded-l-xl bg-[#C7F269] sm:-left-5 sm:w-5" />
      <div className="relative overflow-hidden rounded-[22px] border border-[#C7CEC8] bg-white shadow-[0_28px_80px_rgba(22,32,26,0.14)] dark:border-[#3A443D] dark:bg-[#151B17] dark:shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-[#E0E4DF] px-5 py-4 dark:border-[#323B34] sm:px-6">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#748078] dark:text-[#8F9B92]">
              Today · 35 minutes
            </p>
            <p className="mt-1 text-sm font-bold text-[#16201A] dark:text-[#F3F6F0]">Your practice queue</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#D3DAD3] bg-[#F7F8F5] px-3 py-1.5 dark:border-[#3A443D] dark:bg-[#1D2520]">
            <span className="h-2 w-2 rounded-full bg-[#77A717]" aria-hidden="true" />
            <span className="font-mono text-[11px] font-semibold text-[#526057] dark:text-[#BAC3BC]">ON PACE</span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <article className="rounded-2xl border border-[#B8CF79] bg-[#F7FCE8] p-5 dark:border-[#667B32] dark:bg-[#202B18] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#16201A] font-mono text-xs font-bold text-[#C7F269] dark:bg-[#C7F269] dark:text-[#16201A]">
                  01
                </span>
                <Badge variant="highlight">Next best problem</Badge>
              </div>
              <span className="font-mono text-xs font-semibold text-[#5D6B46] dark:text-[#CFE68A]">86% MATCH</span>
            </div>

            <h2 className="mt-5 text-xl font-bold tracking-[-0.025em] text-[#16201A] dark:text-white sm:text-2xl">
              Longest Repeating Character Replacement
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#536057] dark:text-[#C3CBC5]">
              <Badge variant="warning">Medium</Badge>
              <Badge>Sliding window</Badge>
              <span className="inline-flex items-center gap-1.5 px-1">
                <ClockIcon aria-hidden="true" className="h-4 w-4" />
                ~28 min
              </span>
            </div>

            <div className="mt-5 border-l-2 border-[#91B82F] pl-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#52602E] dark:text-[#C7F269]">
                <BoltIcon aria-hidden="true" className="h-4 w-4" />
                Why this now
              </p>
              <p className="mt-2 text-sm leading-6 text-[#445047] dark:text-[#D5DBD6]">
                You&apos;re 2/4 on sliding-window patterns. This bridges fixed and variable windows before your next graph block.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <span className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#16201A] px-5 text-sm font-semibold text-white dark:bg-[#C7F269] dark:text-[#16201A]">
                Start problem
                <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#C4CCC5] bg-white px-4 text-sm font-semibold text-[#475349] dark:border-[#465149] dark:bg-[#151B17] dark:text-[#D5DBD6]">
                Swap
              </span>
            </div>
          </article>

          <div className="mt-4" aria-label="Two more recommended problems">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-[#748078] dark:text-[#8F9B92]">
              <QueueListIcon aria-hidden="true" className="h-4 w-4" />
              Up next
            </div>
            {queue.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 border-t border-[#E2E6E2] py-3.5 first:border-t-0 dark:border-[#323B34]"
              >
                <span className="font-mono text-xs font-semibold text-[#89938C] dark:text-[#7F8B82]">{item.state}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#263029] dark:text-[#EBEFEB]">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[#748078] dark:text-[#8F9B92]">{item.note}</p>
                </div>
                <Badge>{item.tag}</Badge>
                <CheckIcon aria-hidden="true" className="h-4 w-4 text-[#A1AAA3]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 -right-2 hidden rounded-xl border border-[#CCD3CD] bg-[#16201A] px-4 py-3 text-white shadow-xl sm:block dark:border-[#4B574E]">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C7F269]">This week</p>
        <p className="mt-1 text-sm font-bold">7 / 10 solved</p>
      </div>
    </div>
  );
}
