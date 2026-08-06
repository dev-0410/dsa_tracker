import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const metadata: Metadata = {
  title: "Set up your practice profile",
  description: "Tell Invariant what you are working toward so your first queue fits.",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/onboarding");

  const [user, topics] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, include: { profile: true } }),
    db.topic.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, description: true } }),
  ]);
  if (!user) redirect("/login?error=SessionRequired");
  if (user.profile?.onboardingCompletedAt) redirect("/app");

  return (
    <OnboardingForm
      user={{ name: user.name ?? "", email: user.email ?? "", image: user.image }}
      topics={topics}
    />
  );
}
