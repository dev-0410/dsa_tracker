import { DAY_MS, clamp, defaultTheta, masteryFromTheta, normalizeTopicWeights, sigmoid, toEpoch } from './math';
import type {
  CandidateScore,
  RecommendationConfig,
  RecommendationContext,
  RecommendationMode,
  RecommendationProblem,
  RecommendationReason,
  ScoreComponentName,
  ScoreComponents,
  ScoreContributions,
  TopicBehaviorSignal,
  TopicGoal,
  TopicMasteryState,
  UserProblemState,
} from './types';

export interface CandidateScoringInput {
  topicMastery: TopicMasteryState[];
  topicGoals: TopicGoal[];
  topicBehavior: TopicBehaviorSignal[];
  problemState?: UserProblemState;
  context: RecommendationContext;
  config: RecommendationConfig;
  /** Allows a DAILY candidate to be evaluated for its eventual lane. */
  modeOverride?: Exclude<RecommendationMode, 'DAILY'>;
}

interface TopicNeedDetail {
  topicId: string;
  topicName: string;
  mastery: number;
  target: number;
  weightedGap: number;
}

export function predictedSolveProbability(
  problem: RecommendationProblem,
  topicMastery: TopicMasteryState[],
  experienceLevel: RecommendationContext['experienceLevel'],
  config: RecommendationConfig,
): number {
  const masteryByTopic = new Map(topicMastery.map((state) => [state.topicId, state]));
  const topics = normalizeTopicWeights(problem.topics);
  const priorTheta = defaultTheta(experienceLevel);
  const theta = topics.reduce(
    (total, topic) => total + topic.weight * (masteryByTopic.get(topic.topicId)?.theta ?? priorTheta),
    0,
  );

  return sigmoid(config.irtDiscrimination * (theta - problem.difficultyB));
}

export function calculateDifficultyFit(
  solveProbability: number,
  targetProbability: number,
  sigma: number,
): number {
  const standardizedDistance = (solveProbability - targetProbability) / sigma;
  return clamp(Math.exp(-0.5 * standardizedDistance * standardizedDistance));
}

export function calculateBehaviorAffinity(signal?: TopicBehaviorSignal): number {
  if (!signal || signal.impressions + signal.starts + signal.completions + signal.dismissals <= 0) {
    return 0.5;
  }

  const impressions = Math.max(0, signal.impressions);
  const starts = Math.max(0, signal.starts);
  const completions = Math.max(0, signal.completions);
  const dismissals = Math.max(0, signal.dismissals);

  const startRate = (starts + 2) / (impressions + 5);
  const completionRate = (completions + 2) / (starts + 4);
  const dismissalRate = (dismissals + 1) / (impressions + 10);

  return clamp(0.45 * startRate + 0.55 * completionRate - 0.35 * dismissalRate);
}

/**
 * Deterministic UCB exploration bonus. It gives new topics a boost without
 * introducing a recommendation that changes on every render.
 */
export function calculateUcbExploration(topicImpressions: number, totalImpressions: number): number {
  const safeTopicImpressions = Math.max(0, topicImpressions);
  const safeTotalImpressions = Math.max(safeTopicImpressions, totalImpressions, 0);
  const rawBonus = Math.sqrt(
    (2 * Math.log(safeTotalImpressions + 2)) / (safeTopicImpressions + 1),
  );
  return clamp(rawBonus / 2);
}

export function isDueReview(state: UserProblemState | undefined, now: number): boolean {
  const dueAt = toEpoch(state?.dueAt);
  return dueAt !== null && dueAt <= now;
}

export function calculateReviewUrgency(
  state: UserProblemState | undefined,
  now: number,
): number {
  if (!isDueReview(state, now)) return 0;

  const dueAt = toEpoch(state?.dueAt) ?? now;
  const overdueDays = Math.max(0, (now - dueAt) / DAY_MS);
  const intervalDays = Math.max(1, state?.scheduledDays ?? 7);
  let urgency = 0.5 + 0.5 * clamp(overdueDays / intervalDays);

  if (state?.lastOutcome === 'FAILED' || state?.lastOutcome === 'ABANDONED') {
    urgency = Math.max(urgency, 0.8);
  } else if (state?.lastOutcome === 'PARTIAL') {
    urgency = Math.max(urgency, 0.65);
  }

  return clamp(urgency);
}

function scoreNeedAndGoal(
  problem: RecommendationProblem,
  topicMastery: TopicMasteryState[],
  topicGoals: TopicGoal[],
  context: RecommendationContext,
  config: RecommendationConfig,
): {
  need: number;
  topicGoalFit: number;
  goalFit: number;
  strongestNeed: TopicNeedDetail | null;
  strongestGoalTopic: string | null;
} {
  const topics = normalizeTopicWeights(problem.topics);
  const masteryByTopic = new Map(topicMastery.map((state) => [state.topicId, state]));
  const goalByTopic = new Map(topicGoals.map((goal) => [goal.topicId, goal]));
  const hasExplicitGoals = topicGoals.length > 0;
  const priorTheta = defaultTheta(context.experienceLevel);

  let need = 0;
  let topicGoalFit = 0;
  let strongestNeed: TopicNeedDetail | null = null;
  let strongestGoalTopic: string | null = null;
  let strongestGoalContribution = -1;

  for (const topic of topics) {
    const goal = goalByTopic.get(topic.topicId);
    const priority = clamp(
      goal?.priority ?? (hasExplicitGoals ? 0 : config.defaultGoalPriority),
    );
    const target = clamp(goal?.targetMastery ?? config.defaultTargetMastery, 0.01, 1);
    const mastery = masteryFromTheta(masteryByTopic.get(topic.topicId)?.theta ?? priorTheta);
    const gap = clamp((target - mastery) / target);
    const weightedGap = topic.weight * priority * gap;
    const goalContribution = topic.weight * priority;

    need += weightedGap;
    topicGoalFit += goalContribution;

    if (!strongestNeed || weightedGap > strongestNeed.weightedGap) {
      strongestNeed = {
        topicId: topic.topicId,
        topicName: topic.topicName ?? topic.topicId,
        mastery,
        target,
        weightedGap,
      };
    }

    if (goalContribution > strongestGoalContribution) {
      strongestGoalContribution = goalContribution;
      strongestGoalTopic = topic.topicName ?? topic.topicId;
    }
  }

  const availableMinutes = context.minutesAvailable;
  const timeFit =
    availableMinutes === null || availableMinutes === undefined || availableMinutes <= 0
      ? 1
      : problem.estimatedMinutes <= availableMinutes
        ? 1
        : Math.exp(-(problem.estimatedMinutes / availableMinutes - 1));

  return {
    need: clamp(need),
    topicGoalFit: clamp(topicGoalFit),
    goalFit: clamp(0.75 * topicGoalFit + 0.25 * timeFit),
    strongestNeed,
    strongestGoalTopic,
  };
}

function scoreBehaviorAndExploration(
  problem: RecommendationProblem,
  topicBehavior: TopicBehaviorSignal[],
): { behavior: number; exploration: number } {
  const topics = normalizeTopicWeights(problem.topics);
  const behaviorByTopic = new Map(topicBehavior.map((signal) => [signal.topicId, signal]));
  const totalImpressions = topicBehavior.reduce(
    (total, signal) => total + Math.max(0, signal.impressions),
    0,
  );

  return topics.reduce(
    (result, topic) => {
      const signal = behaviorByTopic.get(topic.topicId);
      result.behavior += topic.weight * calculateBehaviorAffinity(signal);
      result.exploration +=
        topic.weight * calculateUcbExploration(signal?.impressions ?? 0, totalImpressions);
      return result;
    },
    { behavior: 0, exploration: 0 },
  );
}

function formatPercent(value: number): string {
  return `${Math.round(clamp(value) * 100)}%`;
}

function buildReasons(options: {
  problem: RecommendationProblem;
  components: ScoreComponents;
  contributions: ScoreContributions;
  solveProbability: number;
  dueReview: boolean;
  now: number;
  state?: UserProblemState;
  strongestNeed: TopicNeedDetail | null;
  strongestGoalTopic: string | null;
}): RecommendationReason[] {
  const {
    components,
    contributions,
    dueReview,
    now,
    solveProbability,
    state,
    strongestGoalTopic,
    strongestNeed,
  } = options;
  const reasons: RecommendationReason[] = [];

  if (dueReview) {
    const dueAt = toEpoch(state?.dueAt) ?? now;
    const overdueDays = Math.floor(Math.max(0, (now - dueAt) / DAY_MS));
    reasons.push({
      code: 'REVIEW_DUE',
      label: overdueDays > 0 ? `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue` : 'Due for review today',
      component: 'reviewUrgency',
      value: components.reviewUrgency,
      contribution: contributions.reviewUrgency,
    });
  }

  if (strongestNeed && strongestNeed.weightedGap > 0) {
    reasons.push({
      code: 'MASTERY_GAP',
      label: `${strongestNeed.topicName} mastery is ${formatPercent(strongestNeed.mastery)}; target is ${formatPercent(strongestNeed.target)}`,
      component: 'need',
      value: components.need,
      contribution: contributions.need,
    });
  }

  if (strongestGoalTopic && components.goalFit >= 0.55) {
    reasons.push({
      code: 'GOAL_ALIGNED',
      label: `${strongestGoalTopic} aligns with your current goal`,
      component: 'goalFit',
      value: components.goalFit,
      contribution: contributions.goalFit,
    });
  }

  if (components.difficultyFit >= 0.55) {
    reasons.push({
      code: 'DIFFICULTY_MATCH',
      label: `${formatPercent(solveProbability)} predicted independent-solve chance`,
      component: 'difficultyFit',
      value: components.difficultyFit,
      contribution: contributions.difficultyFit,
    });
  }

  if (components.behavior >= 0.65) {
    reasons.push({
      code: 'BEHAVIOR_AFFINITY',
      label: 'Matches topics you consistently engage with',
      component: 'behavior',
      value: components.behavior,
      contribution: contributions.behavior,
    });
  }

  if (components.quality >= 0.8) {
    reasons.push({
      code: 'HIGH_QUALITY',
      label: 'A highly rated practice problem',
      component: 'quality',
      value: components.quality,
      contribution: contributions.quality,
    });
  }

  if (components.exploration >= 0.65) {
    reasons.push({
      code: 'EXPLORE_UNCERTAINTY',
      label: 'Builds evidence in an under-explored topic',
      component: 'exploration',
      value: components.exploration,
      contribution: contributions.exploration,
    });
  }

  const reviewReason = reasons.find((reason) => reason.code === 'REVIEW_DUE');
  const ranked = reasons
    .filter((reason) => reason.code !== 'REVIEW_DUE')
    .sort((left, right) => right.contribution - left.contribution || left.code.localeCompare(right.code));

  return reviewReason ? [reviewReason, ...ranked].slice(0, 3) : ranked.slice(0, 3);
}

function contributionRecord(
  components: ScoreComponents,
  config: RecommendationConfig,
): ScoreContributions {
  return (Object.keys(components) as ScoreComponentName[]).reduce(
    (result, component) => {
      result[component] = components[component] * config.weights[component];
      return result;
    },
    {} as ScoreContributions,
  );
}

export function scoreCandidate(
  problem: RecommendationProblem,
  input: CandidateScoringInput,
): CandidateScore {
  const now = toEpoch(input.context.now);
  if (now === null) throw new Error('Recommendation context contains an invalid current time');

  const dueReview = isDueReview(input.problemState, now);
  const effectiveMode: RecommendationMode =
    input.modeOverride ?? (dueReview ? 'REVIEW' : input.context.mode === 'DAILY' ? 'LEARN' : input.context.mode);
  const solveProbability = predictedSolveProbability(
    problem,
    input.topicMastery,
    input.context.experienceLevel,
    input.config,
  );
  const needAndGoal = scoreNeedAndGoal(
    problem,
    input.topicMastery,
    input.topicGoals,
    input.context,
    input.config,
  );
  const behaviorAndExploration = scoreBehaviorAndExploration(problem, input.topicBehavior);

  const components: ScoreComponents = {
    need: needAndGoal.need,
    goalFit: needAndGoal.goalFit,
    reviewUrgency: calculateReviewUrgency(input.problemState, now),
    difficultyFit: calculateDifficultyFit(
      solveProbability,
      input.config.difficultyTargets[effectiveMode],
      input.config.difficultySigma,
    ),
    behavior: clamp(behaviorAndExploration.behavior),
    quality: clamp(problem.qualityScore),
    exploration: clamp(behaviorAndExploration.exploration),
  };
  const contributions = contributionRecord(components, input.config);
  const baseScore = (Object.values(contributions) as number[]).reduce(
    (total, contribution) => total + contribution,
    0,
  );
  const topics = normalizeTopicWeights(problem.topics);
  const primaryTopicId =
    topics.find((topic) => topic.isPrimary)?.topicId ??
    [...topics].sort((left, right) => right.weight - left.weight)[0]?.topicId ??
    null;

  return {
    problem,
    dueReview,
    predictedSolveProbability: solveProbability,
    topicGoalFit: needAndGoal.topicGoalFit,
    baseScore: clamp(baseScore),
    components,
    contributions,
    reasons: buildReasons({
      problem,
      components,
      contributions,
      solveProbability,
      dueReview,
      now,
      state: input.problemState,
      strongestNeed: needAndGoal.strongestNeed,
      strongestGoalTopic: needAndGoal.strongestGoalTopic,
    }),
    primaryTopicId,
  };
}
