import { redirect } from "next/navigation";
import { AppShell, defaultNavigation } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/app");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user) redirect("/login?error=SessionRequired");
  if (!user.profile?.onboardingCompletedAt) redirect("/onboarding");

  const dueReviews = await db.userProblemState.count({
    where: { userId: user.id, nextReviewAt: { lte: new Date() } },
  });
  const navigation = defaultNavigation.map((item) =>
    item.href === "/app/recommendations" && dueReviews > 0 ? { ...item, badge: dueReviews } : item,
  );

  return (
    <AppShell
      user={{
        name: user.profile.displayName,
        email: user.email,
      }}
      navigation={navigation}
      environmentLabel={process.env.NODE_ENV === "development" ? "Local workspace" : undefined}
    >
      {children}
    </AppShell>
  );
}
