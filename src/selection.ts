import type { RandomStrategy } from './types';

export interface ShuffleState {
  queue: number[];
  signature: string;
}

export interface PickNextIndexParams {
  total: number;
  weights: number[];
  strategy: RandomStrategy;
  previousIndex: number | null;
  avoidImmediateRepeat: boolean;
  random: () => number;
  shuffleState: ShuffleState;
  signature: string;
}

function shuffledIndices(total: number, random: () => number): number[] {
  const result = Array.from({ length: total }, (_, index) => index);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildCandidates(
  total: number,
  previousIndex: number | null,
  avoidImmediateRepeat: boolean
): number[] {
  const all = Array.from({ length: total }, (_, index) => index);
  if (!avoidImmediateRepeat || previousIndex === null || total <= 1) {
    return all;
  }
  return all.filter((index) => index !== previousIndex);
}

function pickByWeight(
  candidates: number[],
  weights: number[],
  random: () => number
): number {
  const safeWeights = candidates.map((candidate) => Math.max(0, weights[candidate] ?? 1));
  const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    return candidates[Math.floor(random() * candidates.length)];
  }

  let cursor = random() * totalWeight;
  for (let i = 0; i < candidates.length; i += 1) {
    cursor -= safeWeights[i];
    if (cursor <= 0) {
      return candidates[i];
    }
  }

  return candidates[candidates.length - 1];
}

export function pickNextIndex({
  total,
  weights,
  strategy,
  previousIndex,
  avoidImmediateRepeat,
  random,
  shuffleState,
  signature
}: PickNextIndexParams): number | null {
  if (total <= 0) {
    return null;
  }

  if (total === 1) {
    return 0;
  }

  if (strategy === 'shuffle') {
    if (shuffleState.signature !== signature) {
      shuffleState.signature = signature;
      shuffleState.queue = [];
    }

    if (shuffleState.queue.length === 0) {
      shuffleState.queue = shuffledIndices(total, random);
    }

    if (
      avoidImmediateRepeat &&
      previousIndex !== null &&
      shuffleState.queue.length > 1 &&
      shuffleState.queue[0] === previousIndex
    ) {
      const swapIndex = 1 + Math.floor(random() * (shuffleState.queue.length - 1));
      [shuffleState.queue[0], shuffleState.queue[swapIndex]] = [
        shuffleState.queue[swapIndex],
        shuffleState.queue[0]
      ];
    }

    if (
      avoidImmediateRepeat &&
      previousIndex !== null &&
      shuffleState.queue.length === 1 &&
      shuffleState.queue[0] === previousIndex
    ) {
      shuffleState.queue = shuffledIndices(total, random);
      if (shuffleState.queue[0] === previousIndex && shuffleState.queue.length > 1) {
        [shuffleState.queue[0], shuffleState.queue[1]] = [
          shuffleState.queue[1],
          shuffleState.queue[0]
        ];
      }
    }

    const next = shuffleState.queue.shift();
    return typeof next === 'number' ? next : null;
  }

  const candidates = buildCandidates(total, previousIndex, avoidImmediateRepeat);
  if (candidates.length === 0) {
    return previousIndex;
  }

  if (strategy === 'weighted') {
    return pickByWeight(candidates, weights, random);
  }

  return candidates[Math.floor(random() * candidates.length)];
}
