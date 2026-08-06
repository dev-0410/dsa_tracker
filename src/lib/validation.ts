import { z } from 'zod';

export const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export const LEARNING_GOALS = [
  'INTERVIEW_PREP',
  'COMPETITIVE_PROGRAMMING',
  'CORE_FUNDAMENTALS',
  'CAREER_SWITCH',
] as const;
export const PREFERRED_LANGUAGES = [
  'CPP',
  'JAVA',
  'PYTHON',
  'JAVASCRIPT',
  'TYPESCRIPT',
  'GO',
  'RUST',
] as const;
export const PLATFORMS = ['LEETCODE', 'CODEFORCES'] as const;
export const ATTEMPT_OUTCOMES = ['SOLVED', 'PARTIAL', 'FAILED', 'ABANDONED'] as const;
export const ATTEMPT_SOURCES = ['IN_APP', 'MANUAL', 'IMPORT'] as const;
export const RECOMMENDATION_MODES = ['DAILY', 'LEARN', 'REVIEW', 'CHALLENGE'] as const;
export const RECOMMENDATION_EVENT_TYPES = [
  'IMPRESSION',
  'OPENED',
  'STARTED',
  'DISMISSED',
  'BOOKMARKED',
] as const;

const entityIdSchema = z.string().trim().min(1).max(64);
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Use only letters, numbers, dots, underscores, colons, and dashes.');

const profileShape = {
  handle: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, 'Use lowercase letters, numbers, underscores, or dashes.'),
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(240).nullable().optional(),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    }, 'Use a valid IANA timezone.'),
  currentRole: z.string().trim().min(2).max(80).nullable().optional(),
  targetRole: z.string().trim().min(2).max(80),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  learningGoal: z.enum(LEARNING_GOALS),
  weeklyTarget: z.coerce.number().int().min(1).max(100),
  minutesPerDay: z.coerce.number().int().min(5).max(720),
  preferredLanguage: z.enum(PREFERRED_LANGUAGES),
  targetDate: z.coerce.date().nullable().optional(),
  isPublic: z.boolean().optional().default(false),
};

export const platformIdentitySchema = z
  .object({
    platform: z.enum(PLATFORMS),
    handle: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_.-]+$/, 'The platform handle contains unsupported characters.'),
  })
  .strict();

export const userProfileSchema = z.object(profileShape).strict();

export const profileUpdateSchema = z
  .object(profileShape)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one profile field.')
  .superRefine((value, context) => {
    if (value.targetDate && value.targetDate.getTime() < Date.now() - 24 * 60 * 60 * 1_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target date must be in the future.',
        path: ['targetDate'],
      });
    }
  });

export const onboardingSchema = z
  .object({
    ...profileShape,
    topicIds: z.array(entityIdSchema).min(3).max(12).refine(
      (values) => new Set(values).size === values.length,
      'Choose each topic only once.',
    ),
    platformIdentities: z
      .array(platformIdentitySchema)
      .min(1)
      .max(PLATFORMS.length)
      .superRefine((identities, context) => {
        const platforms = identities.map(({ platform }) => platform);
        if (new Set(platforms).size !== platforms.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Each platform can only be connected once.',
          });
        }
      }),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.targetDate && value.targetDate.getTime() < Date.now() - 24 * 60 * 60 * 1_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target date must be in the future.',
        path: ['targetDate'],
      });
    }
  });

export const attemptSchema = z
  .object({
    problemId: entityIdSchema,
    recommendationItemId: entityIdSchema.nullable().optional(),
    idempotencyKey: idempotencyKeySchema,
    outcome: z.enum(ATTEMPT_OUTCOMES),
    source: z.literal('IN_APP').optional().default('IN_APP'),
    startedAt: z.coerce.date().nullable().optional(),
    durationMinutes: z.coerce.number().int().min(1).max(24 * 60),
    hintsUsed: z.coerce.number().int().min(0).max(100).optional().default(0),
    confidence: z.coerce.number().int().min(1).max(5),
    language: z.enum(PREFERRED_LANGUAGES).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startedAt && value.startedAt.getTime() > Date.now()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time cannot be in the future.',
        path: ['startedAt'],
      });
    }
    if (value.startedAt && value.startedAt.getTime() < Date.now() - 24 * 60 * 60 * 1_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time cannot be more than 24 hours old.',
        path: ['startedAt'],
      });
    }
  });

const queryBoolean = z.preprocess((value) => {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}, z.boolean());

export const recommendationQuerySchema = z
  .object({
    mode: z.enum(RECOMMENDATION_MODES).optional().default('DAILY'),
    limit: z.coerce.number().int().min(1).max(20).optional().default(10),
    minutesAvailable: z.coerce.number().int().min(5).max(720).optional(),
    includePremium: queryBoolean.optional().default(false),
    forceRefresh: queryBoolean.optional().default(false),
  })
  .strict();

export const recommendationEventSchema = z
  .object({
    itemId: entityIdSchema,
    type: z.enum(RECOMMENDATION_EVENT_TYPES),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const recommendationEventBodySchema = recommendationEventSchema.omit({ itemId: true });

export const focusTopicsSchema = z
  .object({
    topicIds: z.array(entityIdSchema).min(3).max(12).refine(
      (values) => new Set(values).size === values.length,
      'Choose each topic only once.',
    ),
  })
  .strict();

export function normalizePlatformHandle(handle: string): string {
  return handle.trim().toLocaleLowerCase('en-US');
}

export function platformProfileUrl(
  platform: (typeof PLATFORMS)[number],
  handle: string,
): string {
  const encodedHandle = encodeURIComponent(handle.trim());
  return platform === 'LEETCODE'
    ? `https://leetcode.com/u/${encodedHandle}/`
    : `https://codeforces.com/profile/${encodedHandle}`;
}

export type AttemptInput = z.infer<typeof attemptSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type PlatformIdentityInput = z.infer<typeof platformIdentitySchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type RecommendationEventInput = z.infer<typeof recommendationEventSchema>;
export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;
