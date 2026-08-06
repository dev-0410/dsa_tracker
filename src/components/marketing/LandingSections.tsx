import Link from "next/link";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathRoundedSquareIcon,
  ArrowRightIcon,
  ChartBarSquareIcon,
  CheckIcon,
  CircleStackIcon,
  ClockIcon,
  CodeBracketSquareIcon,
  EyeIcon,
  FlagIcon,
  LightBulbIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Badge, buttonStyles, Container, SectionHeading } from "@/components/ui";

const workflow = [
  {
    number: "01",
    title: "Set the destination",
    description: "Tell us the role, interview window, weekly time, and language you are working toward.",
    icon: FlagIcon,
  },
  {
    number: "02",
    title: "Connect your signal",
    description: "Connect a public coding profile for aggregate progress, then set a short, honest topic baseline.",
    icon: CircleStackIcon,
  },
  {
    number: "03",
    title: "Work the right edge",
    description: "Get a focused daily queue that balances learning, review, and an achievable stretch.",
    icon: AdjustmentsHorizontalIcon,
  },
];

const progressItems = [
  { label: "Binary search", value: 82, note: "Strong", color: "bg-[#78A51A]" },
  { label: "Sliding window", value: 61, note: "Developing", color: "bg-[#C8A13B]" },
  { label: "Dynamic programming", value: 38, note: "Focus next", color: "bg-[#D06747]" },
];

export function LandingSections() {
  return (
    <>
      <section id="how-it-works" className="scroll-mt-20 bg-[#F4F3EE] py-20 dark:bg-[#0D120F] sm:py-24 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow="A better practice loop"
            title="Less browsing. More deliberate work."
            description="Invariant removes the daily decision tax without hiding the reasoning. You stay in control of the goal; the queue handles the sequencing."
          />

          <ol className="mt-12 grid border-y border-[#CBD2CC] dark:border-[#323B34] lg:grid-cols-3">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.number}
                  className={`relative py-8 lg:px-8 lg:py-10 ${
                    index > 0
                      ? "border-t border-[#CBD2CC] dark:border-[#323B34] lg:border-l lg:border-t-0"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold tracking-[0.18em] text-[#718068] dark:text-[#8F9B92]">
                      STEP {step.number}
                    </span>
                    <Icon aria-hidden="true" className="h-6 w-6 text-[#52682C] dark:text-[#C7F269]" />
                  </div>
                  <h3 className="mt-8 text-xl font-bold tracking-[-0.025em] text-[#16201A] dark:text-[#F3F6F0]">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[#667269] dark:text-[#A6B0A8] sm:text-base sm:leading-7">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      <section id="recommendations" className="scroll-mt-20 bg-[#16201A] py-20 text-white sm:py-24 lg:py-28">
        <Container className="grid items-center gap-14 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#C7F269]">
              Recommendations you can inspect
            </p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.045em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
              The system shows its work.
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-[#C1C9C3] sm:text-lg">
              Every pick includes the signals behind it, so “recommended” never means random. Skip, swap, or tell us why it missed—the queue learns from that too.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "Recent misses and successful patterns",
                "Topic mastery and review timing",
                "Available time and target difficulty",
                "Your explicit skips and preferences",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-semibold text-[#E6EBE7]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C7F269] text-[#16201A]">
                    <CheckIcon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[20px] border border-[#3C493F] bg-[#111713] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.3)] sm:p-7">
            <div className="flex flex-col justify-between gap-4 border-b border-[#344038] pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#89958C]">Decision trace</p>
                <h3 className="mt-1 text-lg font-bold">Why “Character Replacement”?</h3>
              </div>
              <Badge variant="highlight">86% match</Badge>
            </div>

            <dl className="mt-2 divide-y divide-[#2D3831]">
              {[
                { label: "Skill gap", value: "+32", detail: "Sliding window mastery is below target" },
                { label: "Prerequisites", value: "+24", detail: "Arrays and hash maps are ready" },
                { label: "Goal fit", value: "+18", detail: "Common in your target interview band" },
                { label: "Time fit", value: "+12", detail: "Fits today’s 35-minute session" },
              ].map((signal) => (
                <div key={signal.label} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-4">
                  <dt className="text-sm font-bold text-[#F2F5F2]">{signal.label}</dt>
                  <dd className="row-span-2 font-mono text-sm font-bold text-[#C7F269]">{signal.value}</dd>
                  <dd className="text-xs leading-5 text-[#93A097]">{signal.detail}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#3C493F] bg-[#1C251F] p-4">
              <EyeIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#C7F269]" />
              <p className="text-xs leading-5 text-[#C3CBC5]">
                Confidence is directional, not a promise. Your feedback changes the next ranking.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section id="progress" className="scroll-mt-20 bg-white py-20 dark:bg-[#111713] sm:py-24 lg:py-28">
        <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="order-2 rounded-[20px] border border-[#CCD3CD] bg-[#F8F8F4] p-5 dark:border-[#3A443D] dark:bg-[#151B17] sm:p-7 lg:order-1">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D8DED9] pb-5 dark:border-[#323B34]">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#748078] dark:text-[#8F9B92]">
                  Topic mastery
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-[-0.025em] text-[#16201A] dark:text-white">
                  Where your effort is landing
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667269] dark:text-[#9EA89F]">
                <ArrowPathRoundedSquareIcon aria-hidden="true" className="h-4 w-4" />
                Updated today
              </span>
            </div>

            <div className="mt-7 space-y-6">
              {progressItems.map((item) => (
                <div key={item.label}>
                  <div className="mb-2.5 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-sm font-bold text-[#273129] dark:text-[#EEF2EE]">{item.label}</span>
                      <span className="ml-2 text-xs text-[#7B867F] dark:text-[#8F9B92]">{item.note}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#4D5A51] dark:text-[#BAC3BC]">{item.value}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#E2E6E2] dark:bg-[#29322C]">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#D6DCD7] bg-white p-4 dark:border-[#354039] dark:bg-[#111713]">
                <ClockIcon aria-hidden="true" className="h-5 w-5 text-[#657D2D] dark:text-[#C7F269]" />
                <p className="mt-3 text-xs font-semibold text-[#77827A] dark:text-[#8F9B92]">Reviews due</p>
                <p className="mt-1 font-mono text-2xl font-bold text-[#16201A] dark:text-white">3</p>
              </div>
              <div className="rounded-xl border border-[#D6DCD7] bg-white p-4 dark:border-[#354039] dark:bg-[#111713]">
                <ChartBarSquareIcon aria-hidden="true" className="h-5 w-5 text-[#657D2D] dark:text-[#C7F269]" />
                <p className="mt-3 text-xs font-semibold text-[#77827A] dark:text-[#8F9B92]">Weekly consistency</p>
                <p className="mt-1 font-mono text-2xl font-bold text-[#16201A] dark:text-white">5 / 7</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Progress that changes the plan"
              title="Measure mastery, not just volume."
              description="Solved counts tell only part of the story. Invariant tracks consistency, topic confidence, review retention, and difficulty progression—then feeds those signals back into tomorrow’s queue."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="border-l-2 border-[#9EC637] pl-4">
                <LightBulbIcon aria-hidden="true" className="h-5 w-5 text-[#607B20] dark:text-[#C7F269]" />
                <p className="mt-2 text-sm font-bold text-[#263029] dark:text-[#E8ECE8]">Plain-language insights</p>
                <p className="mt-1 text-sm leading-6 text-[#69756C] dark:text-[#9EA89F]">See the next useful adjustment, not another chart to decode.</p>
              </div>
              <div className="border-l-2 border-[#9EC637] pl-4">
                <ShieldCheckIcon aria-hidden="true" className="h-5 w-5 text-[#607B20] dark:text-[#C7F269]" />
                <p className="mt-2 text-sm font-bold text-[#263029] dark:text-[#E8ECE8]">Your data, your choice</p>
                <p className="mt-1 text-sm leading-6 text-[#69756C] dark:text-[#9EA89F]">Control connected profiles, visibility, export, and deletion.</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-[#D3DAD3] bg-[#EEF0EB] py-12 dark:border-[#323B34] dark:bg-[#0D120F]">
        <Container className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.17em] text-[#6F7C72] dark:text-[#8F9B92]">
              One practice picture
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[#16201A] dark:text-white">
              Start with LeetCode. Keep room for the rest.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3" aria-label="Supported platform connections">
            {[
              { label: "LeetCode", status: "Live" },
              { label: "Codeforces", status: "Live" },
            ].map((platform) => (
              <span
                key={platform.label}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#CBD2CC] bg-white px-4 text-sm font-bold text-[#364138] dark:border-[#3A443D] dark:bg-[#151B17] dark:text-[#E5EAE6]"
              >
                <CodeBracketSquareIcon aria-hidden="true" className="h-5 w-5 text-[#607B20] dark:text-[#C7F269]" />
                {platform.label}
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-[#7A867D]">{platform.status}</span>
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#F4F3EE] py-20 dark:bg-[#0D120F] sm:py-24">
        <Container>
          <div className="relative overflow-hidden rounded-[24px] border border-[#A9CC50] bg-[#C7F269] p-7 text-[#16201A] sm:p-10 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:p-14">
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full border border-[#90B42F]/60" />
            <div aria-hidden="true" className="absolute -right-4 -top-4 h-28 w-28 rounded-full border border-[#90B42F]/60" />
            <div className="relative max-w-2xl">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#4B601A]">Your next session can be clearer</p>
              <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                Stop collecting problem lists. Start building capability.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#3E4C22] sm:text-lg">
                Set your goal in a few minutes and get a queue you can understand, complete, and improve.
              </p>
            </div>
            <Link
              href="/login"
              className={buttonStyles({
                variant: "primary",
                size: "lg",
                className: "relative mt-8 lg:mt-0",
              })}
            >
              Build my queue
              <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
