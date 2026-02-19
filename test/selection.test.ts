import { describe, expect, it } from 'vitest';
import { pickNextIndex, type ShuffleState } from '../src/selection';

describe('pickNextIndex', () => {
  it('returns null when there are no sources', () => {
    const next = pickNextIndex({
      total: 0,
      weights: [],
      strategy: 'uniform',
      previousIndex: null,
      avoidImmediateRepeat: true,
      random: () => 0.5,
      shuffleState: { queue: [], signature: '' },
      signature: 'a'
    });

    expect(next).toBeNull();
  });

  it('supports weighted selection', () => {
    const next = pickNextIndex({
      total: 3,
      weights: [0, 0, 4],
      strategy: 'weighted',
      previousIndex: null,
      avoidImmediateRepeat: true,
      random: () => 0.2,
      shuffleState: { queue: [], signature: '' },
      signature: 'a'
    });

    expect(next).toBe(2);
  });

  it('avoids immediate repeats when possible', () => {
    const next = pickNextIndex({
      total: 2,
      weights: [1, 1],
      strategy: 'uniform',
      previousIndex: 0,
      avoidImmediateRepeat: true,
      random: () => 0,
      shuffleState: { queue: [], signature: '' },
      signature: 'a'
    });

    expect(next).toBe(1);
  });

  it('walks through a shuffled queue before repeating in shuffle mode', () => {
    const shuffleState: ShuffleState = { queue: [], signature: '' };
    const random = () => 0.1;

    const first = pickNextIndex({
      total: 3,
      weights: [1, 1, 1],
      strategy: 'shuffle',
      previousIndex: null,
      avoidImmediateRepeat: false,
      random,
      shuffleState,
      signature: 'x'
    });

    const second = pickNextIndex({
      total: 3,
      weights: [1, 1, 1],
      strategy: 'shuffle',
      previousIndex: first,
      avoidImmediateRepeat: false,
      random,
      shuffleState,
      signature: 'x'
    });

    const third = pickNextIndex({
      total: 3,
      weights: [1, 1, 1],
      strategy: 'shuffle',
      previousIndex: second,
      avoidImmediateRepeat: false,
      random,
      shuffleState,
      signature: 'x'
    });

    expect(new Set([first, second, third]).size).toBe(3);
  });
});
