import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { requireCompleteUser } from "@/lib/auth";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

const createdUserIds: string[] = [];
const mockedSession = vi.mocked(getServerSession);

async function createUser() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 18);
  const user = await db.user.create({
    data: {
      name: "Auth Integration User",
      email: `${suffix}@auth.integration.invalid`,
      emailVerified: new Date(),
    },
  });
  createdUserIds.push(user.id);
  return { user, suffix };
}

describe.sequential("database session and onboarding boundary", () => {
  afterEach(async () => {
    mockedSession.mockReset();
    const ids = createdUserIds.splice(0);
    if (ids.length) await db.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("rejects anonymous and incomplete accounts before allowing a completed profile", async () => {
    const { user, suffix } = await createUser();
    mockedSession.mockResolvedValueOnce(null);
    await expect(requireCompleteUser()).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });

    mockedSession.mockResolvedValueOnce({
      expires: new Date(Date.now() + 60_000).toISOString(),
      user: { id: user.id, email: user.email, name: user.name },
    });
    await expect(requireCompleteUser()).rejects.toMatchObject({ code: "ONBOARDING_REQUIRED", status: 403 });

    await db.userProfile.create({
      data: {
        userId: user.id,
        handle: `auth_${suffix}`,
        displayName: "Auth Integration User",
        timezone: "UTC",
        targetRole: "Software Engineer",
        experienceLevel: "INTERMEDIATE",
        learningGoal: "INTERVIEW_PREP",
        preferredLanguage: "PYTHON",
        onboardingCompletedAt: new Date(),
      },
    });
    mockedSession.mockResolvedValueOnce({
      expires: new Date(Date.now() + 60_000).toISOString(),
      user: { id: user.id, email: user.email, name: user.name },
    });
    await expect(requireCompleteUser()).resolves.toMatchObject({
      id: user.id,
      profile: { onboardingCompletedAt: expect.any(Date) },
    });
  });

  it("cascades database sessions and provider accounts when an account is deleted", async () => {
    const { user, suffix } = await createUser();
    await db.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: "google",
        providerAccountId: `google-${suffix}`,
      },
    });
    await db.session.create({
      data: {
        userId: user.id,
        sessionToken: `session-${suffix}`,
        expires: new Date(Date.now() + 60_000),
      },
    });

    await db.user.delete({ where: { id: user.id } });
    expect(await db.account.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });
});
