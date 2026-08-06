export type DateValue = Date | string | number;

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type RecommendationMode =
  | 'DAILY'
  | 'LEARN'
  | 'REVIEW'
  | 'EXPLORE'
  | 'CHALLENGE';

export type RecommendationLane = 'LEARN' | 'REVIEW' | 'EXPLORE' | 'CHALLENGE';

export type AttemptOutcome = 'SOLVED' | 'PARTIAL' | 'FAILED' | 'ABANDONED';

export interface ProblemTopic {
  topicId: string;
  topicName?: string;
  weight: number;
  isPrimary?: boolean;
}

/**
 * The database adapter only needs to produce this shape. The recommendation
 * package deliberately has no Prisma or transport-layer dependencies.
 */
export interface RecommendationProblem {
  id: string;
  title: string;
  source?: string;
  url?: string;
  difficulty: Difficulty;
  /** IRT/Rasch difficulty, conventionally in the [-3, 3] range. */
  difficultyB: number;
  estimatedMinutes: number;
  qualityScore: number;
  /** Optional catalog-level pattern used for stronger set diversification. */
  pattern?: string | null;
  isActive: boolean;
  isPremium: boolean;
  topics: ProblemTopic[];
  prerequisiteTopicIds?: string[];
}

export interface TopicMasteryState {
  topicId: string;
  theta: number;
  attemptCount: number;
  effectiveSuccesses?: number;
  uncertainty?: number;
  lastPracticedAt?: DateValue | null;
}

export interface TopicGoal {
  topicId: string;
  /** Relative importance in [0, 1]. */
  priority: number;
  /** Desired display mastery in [0, 1]. */
  targetMastery?: number;
}

export interface TopicBehaviorSignal {
  topicId: string;
  impressions: number;
  starts: number;
  completions: number;
  dismissals: number;
}

export interface UserProblemState {
  problemId: string;
  attemptCount: number;
  solveCount: number;
  solved: boolean;
  lastOutcome?: AttemptOutcome | null;
  dueAt?: DateValue | null;
  scheduledDays?: number | null;
  dismissedUntil?: DateValue | null;
  lastServedAt?: DateValue | null;
}

export interface RecommendationContext {
  mode: RecommendationMode;
  limit: number;
  now: DateValue;
  /** Used only for stable tie-breaking. The same input and seed give the same slate. */
  seed: string | number;
  experienceLevel: ExperienceLevel;
  minutesAvailable?: number | null;
  includePremium?: boolean;
}

export interface RecommendationInput {
  candidates: RecommendationProblem[];
  topicMastery: TopicMasteryState[];
  topicGoals: TopicGoal[];
  topicBehavior?: TopicBehaviorSignal[];
  problemStates?: UserProblemState[];
  context: RecommendationContext;
  config?: PartialRecommendationConfig;
}

export type ScoreComponentName =
  | 'need'
  | 'goalFit'
  | 'reviewUrgency'
  | 'difficultyFit'
  | 'behavior'
  | 'quality'
  | 'exploration';

export type ScoreComponents = Record<ScoreComponentName, number>;

export type ScoreContributions = Record<ScoreComponentName, number>;

export type RecommendationReasonCode =
  | 'REVIEW_DUE'
  | 'MASTERY_GAP'
  | 'GOAL_ALIGNED'
  | 'DIFFICULTY_MATCH'
  | 'BEHAVIOR_AFFINITY'
  | 'HIGH_QUALITY'
  | 'EXPLORE_UNCERTAINTY';

export interface RecommendationReason {
  code: RecommendationReasonCode;
  label: string;
  component: ScoreComponentName;
  value: number;
  contribution: number;
}

export interface CandidateScore {
  problem: RecommendationProblem;
  dueReview: boolean;
  predictedSolveProbability: number;
  topicGoalFit: number;
  baseScore: number;
  components: ScoreComponents;
  contributions: ScoreContributions;
  reasons: RecommendationReason[];
  primaryTopicId: string | null;
}

export interface RankedRecommendation extends CandidateScore {
  rank: number;
  lane: RecommendationLane;
  finalScore: number;
  diversityPenalty: number;
}

export type ExclusionCode =
  | 'DUPLICATE_ID'
  | 'INVALID_METADATA'
  | 'INACTIVE'
  | 'PREMIUM_LOCKED'
  | 'DISMISSED'
  | 'RECENTLY_SERVED'
  | 'SOLVED_NOT_DUE'
  | 'UNMET_PREREQUISITE'
  | 'MODE_MISMATCH';

export interface CandidateExclusion {
  problemId: string;
  codes: ExclusionCode[];
}

export interface RecommendationQuotas {
  review: number;
  learn: number;
  explore: number;
  challenge: number;
}

export interface RecommendationDiagnostics {
  eligibleCount: number;
  excludedCount: number;
  dueCount: number;
  quotas: RecommendationQuotas;
  exclusions: CandidateExclusion[];
}

export interface RecommendationResult {
  algorithmVersion: string;
  generatedAt: string;
  items: RankedRecommendation[];
  diagnostics: RecommendationDiagnostics;
}

export interface RecommendationWeights {
  need: number;
  goalFit: number;
  reviewUrgency: number;
  difficultyFit: number;
  behavior: number;
  quality: number;
  exploration: number;
}

export interface DifficultyTargets {
  DAILY: number;
  LEARN: number;
  REVIEW: number;
  EXPLORE: number;
  CHALLENGE: number;
}

export interface SimilarityWeights {
  topicOverlap: number;
  primaryTopic: number;
  difficulty: number;
}

export interface RecommendationConfig {
  algorithmVersion: string;
  weights: RecommendationWeights;
  difficultyTargets: DifficultyTargets;
  difficultySigma: number;
  irtDiscrimination: number;
  defaultTargetMastery: number;
  defaultGoalPriority: number;
  minimumPrerequisiteMastery: number;
  recentlyServedHours: number;
  explorationGoalFloor: number;
  explorationMinSolveProbability: number;
  explorationMaxSolveProbability: number;
  mmrRelevanceWeight: number;
  similarityWeights: SimilarityWeights;
  maxPrimaryTopicPerFive: number;
  maxBeginnerHardPerFive: number;
  normalReviewShare: number;
  backlogReviewShare: number;
  backlogMultiple: number;
  masteryLearningRate: number;
  minimumMeaningfulAttemptMinutes: number;
}

export interface PartialRecommendationConfig
  extends Partial<Omit<RecommendationConfig, 'weights' | 'difficultyTargets' | 'similarityWeights'>> {
  weights?: Partial<RecommendationWeights>;
  difficultyTargets?: Partial<DifficultyTargets>;
  similarityWeights?: Partial<SimilarityWeights>;
}

export interface MasteryAttempt {
  outcome: AttemptOutcome;
  durationMinutes?: number | null;
  hintsUsed?: number | null;
  /** Self-reported confidence on a 1-5 scale. */
  confidence?: number | null;
  /** Explicitly overrides the duration-based abandonment check. */
  meaningful?: boolean;
}

export interface TopicMasteryDelta {
  topicId: string;
  beforeTheta: number;
  afterTheta: number;
  beforeMastery: number;
  afterMastery: number;
  delta: number;
  attemptCount: number;
  effectiveSuccesses: number;
  uncertainty: number;
}

export interface MasteryUpdateResult {
  updated: boolean;
  effectiveOutcome: number;
  predictedSolveProbability: number;
  topics: TopicMasteryDelta[];
}
