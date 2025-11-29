import { describe, expect, it } from 'vitest';

import { GameEngine, computeCategoryScore, type CategoryKey } from './engine';

describe('GameEngine', () => {
  it('initializes with defaults and categories', () => {
    const engine = new GameEngine();
    const state = engine.getState();

    expect(state.currentRound).toBe(1);
    expect(state.maxRounds).toBe(13);
    expect(state.rollsThisRound).toBe(0);
    expect(state.dice.every((d) => d === null)).toBe(true);
    expect(state.holds.every((h) => h === false)).toBe(true);

    const bonus = state.categories.find((c) => c.key === 'upper-bonus');
    expect(bonus?.interactive).toBe(false);
    expect(state.categories.filter((c) => c.interactive !== false)).toHaveLength(13);
  });

  it('records rolls and honors held dice on reroll', () => {
    const engine = new GameEngine();
    engine.recordRoll([1, 2, 3, 4, 5]);
    engine.toggleHold(0);

    engine.recordRoll([6, 6, 6, 6, 6]);
    const state = engine.getState();

    expect(state.dice[0]).toBe(1);
    expect(state.dice.slice(1)).toEqual([6, 6, 6, 6]);
    expect(state.rollsThisRound).toBe(2);
    expect(state.holds[0]).toBe(true);
  });

  it('prevents holds before the first roll', () => {
    const engine = new GameEngine();
    expect(() => engine.toggleHold(0)).toThrow(/first roll/);
  });

  it('scores categories and advances rounds', () => {
    const engine = new GameEngine();
    engine.recordRoll([2, 2, 3, 3, 3]);
    const score = engine.scoreCategory('full-house');

    const state = engine.getState();
    const cat = state.categories.find((c) => c.key === 'full-house');

    expect(score).toBe(25);
    expect(cat?.score).toBe(25);
    expect(cat?.scoredDice).toEqual([2, 2, 3, 3, 3]);
    expect(state.currentRound).toBe(2);
    expect(state.rollsThisRound).toBe(0);
    expect(state.dice.every((d) => d === null)).toBe(true);
  });

  it('applies upper bonus after all upper categories are scored', () => {
    const engine = new GameEngine();
    const upper: CategoryKey[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];

    upper.forEach((key, idx) => {
      const face = idx + 1;
      engine.recordRoll([face, face, face, face, face]);
      engine.scoreCategory(key);
    });

    const state = engine.getState();
    const bonus = state.categories.find((c) => c.key === 'upper-bonus');

    expect(bonus?.scored).toBe(true);
    expect(bonus?.score).toBe(35);
    expect(state.totals.upper).toBe(105);
    expect(state.totals.bonus).toBe(35);
  });

  it('enforces the roll limit per round', () => {
    const engine = new GameEngine();
    engine.recordRoll([1, 2, 3, 4, 5]);
    engine.recordRoll([1, 2, 3, 4, 5]);
    engine.recordRoll([1, 2, 3, 4, 5]);
    expect(() => engine.recordRoll([1, 2, 3, 4, 5])).toThrow(/No rolls left/);
  });

  it('computes straights using the same rules as the Phaser scene', () => {
    expect(computeCategoryScore('small-straight', [1, 2, 3, 4, 6])).toBe(30);
    expect(computeCategoryScore('large-straight', [2, 3, 4, 5, 6])).toBe(40);
    expect(computeCategoryScore('large-straight', [1, 2, 3, 4, 6])).toBe(0);
    expect(computeCategoryScore('small-straight', [1, 2, 2, 3, 4])).toBe(30);
  });

  it('marks the game complete after all interactive categories are scored', () => {
    const engine = new GameEngine();
    const categories: CategoryKey[] = [
      'ones',
      'twos',
      'threes',
      'fours',
      'fives',
      'sixes',
      'three-kind',
      'four-kind',
      'full-house',
      'small-straight',
      'large-straight',
      'yahtzee',
      'chance'
    ];

    categories.forEach((key) => {
      engine.recordRoll([6, 6, 6, 6, 6]);
      engine.scoreCategory(key);
    });

    const state = engine.getState();
    expect(state.completed).toBe(true);
    expect(state.rollsThisRound).toBe(0);
    expect(state.holds.every((h) => h === false)).toBe(true);
  });
});
