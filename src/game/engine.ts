export type CategoryKey =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'upper-bonus'
  | 'three-kind'
  | 'four-kind'
  | 'full-house'
  | 'small-straight'
  | 'large-straight'
  | 'yahtzee'
  | 'chance';

export type DiceValue = number | null;

export type ScoreCategoryState = {
  key: CategoryKey;
  label: string;
  section: 'upper' | 'lower' | 'bonus';
  interactive: boolean;
  scored: boolean;
  score: number | null;
  scoredDice: number[] | null;
  roundScored: number | null;
};

export type GameTotals = {
  upper: number;
  lower: number;
  bonus: number;
  grand: number;
};

export type GameState = {
  dice: DiceValue[];
  holds: boolean[];
  rollsThisRound: number;
  currentRound: number;
  maxRounds: number;
  maxRolls: number;
  categories: ScoreCategoryState[];
  totals: GameTotals;
  completed: boolean;
};

export type GameConfig = {
  diceCount?: number;
  maxRolls?: number;
  upperBonusThreshold?: number;
  upperBonusValue?: number;
  maxRounds?: number;
};

const UPPER_CATEGORY_KEYS: CategoryKey[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
const LOWER_CATEGORY_KEYS: CategoryKey[] = [
  'three-kind',
  'four-kind',
  'full-house',
  'small-straight',
  'large-straight',
  'yahtzee',
  'chance'
];

const DEFAULT_CONFIG: Required<GameConfig> = {
  diceCount: 5,
  maxRolls: 3,
  upperBonusThreshold: 63,
  upperBonusValue: 35,
  maxRounds: UPPER_CATEGORY_KEYS.length + LOWER_CATEGORY_KEYS.length
};

export class GameEngine {
  private state: GameState;
  private readonly config: Required<GameConfig>;

  constructor(config: GameConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  getState(): GameState {
    return this.cloneState();
  }

  resetGame() {
    this.state = this.createInitialState();
    return this.getState();
  }

  recordRoll(values: number[]) {
    if (this.state.completed) {
      throw new Error('Game is already complete');
    }
    if (this.state.rollsThisRound >= this.config.maxRolls) {
      throw new Error('No rolls left this round');
    }
    if (values.length !== this.config.diceCount) {
      throw new Error(`Expected ${this.config.diceCount} dice values`);
    }
    const normalized = values.map((v) => normalizeDieValue(v));
    const nextDice = this.state.dice.map((prev, idx) => {
      if (this.state.holds[idx]) return prev;
      const next = normalized[idx];
      if (next === null) {
        throw new Error(`Die ${idx + 1} is missing a value`);
      }
      return next;
    });

    this.state.dice = nextDice;
    this.state.rollsThisRound += 1;
    return this.getState();
  }

  toggleHold(index: number) {
    if (index < 0 || index >= this.config.diceCount) {
      throw new Error(`Die index ${index} is out of bounds`);
    }
    if (this.state.rollsThisRound === 0) {
      throw new Error('Cannot hold dice before the first roll');
    }
    if (this.state.completed) {
      throw new Error('Game is already complete');
    }
    const holds = [...this.state.holds];
    holds[index] = !holds[index];
    this.state.holds = holds;
    return this.getState();
  }

  previewCategory(key: CategoryKey, diceOverride?: number[]) {
    const dice = diceOverride ?? this.requireFullDice();
    return computeCategoryScore(key, dice);
  }

  scoreCategory(key: CategoryKey) {
    const cat = this.findCategory(key);
    if (!cat) {
      throw new Error(`Unknown category ${key}`);
    }
    if (cat.interactive === false) {
      throw new Error(`Category ${key} is not user-scoreable`);
    }
    if (cat.scored) {
      throw new Error(`Category ${key} already scored`);
    }
    if (this.state.completed) {
      throw new Error('Game is already complete');
    }

    const dice = this.requireFullDice();
    const score = computeCategoryScore(key, dice);
    const roundNumber = this.state.currentRound;
    cat.score = score;
    cat.scored = true;
    cat.scoredDice = [...dice];
    cat.roundScored = roundNumber;

    this.updateUpperBonus();
    this.recomputeTotals();
    this.advanceRound();

    return score;
  }

  startNewRound() {
    if (this.state.completed) return this.getState();
    this.state = {
      ...this.state,
      currentRound: Math.min(this.state.currentRound + 1, this.config.maxRounds),
      rollsThisRound: 0,
      dice: this.emptyDice(),
      holds: this.emptyHolds()
    };
    return this.getState();
  }

  hydrateState(snapshot?: GameState | null) {
    if (!snapshot) return this.getState();
    const template = this.createInitialState();
    const dice = normalizeSavedDice(snapshot.dice, this.config.diceCount);
    const holds = normalizeSavedHolds(snapshot.holds, this.config.diceCount);
    const rollsThisRound = clampNumber(
      snapshot.rollsThisRound,
      0,
      this.config.maxRolls,
      template.rollsThisRound
    );
    const currentRound = clampNumber(
      snapshot.currentRound,
      1,
      this.config.maxRounds,
      template.currentRound
    );
    const savedCategories = new Map<CategoryKey, ScoreCategoryState>(
      Array.isArray(snapshot.categories) ? snapshot.categories.map((cat) => [cat.key, cat]) : []
    );
    const categories = template.categories.map((cat) => {
      const saved = savedCategories.get(cat.key);
      if (!saved) return cat;
      const score = typeof saved.score === 'number' && Number.isFinite(saved.score) ? saved.score : null;
      const scored = saved.scored === true;
      const scoredDice =
        scored && Array.isArray(saved.scoredDice)
          ? normalizeScoredDice(saved.scoredDice, this.config.diceCount)
          : null;
      const roundScored = scored ? clampNumberOrNull(saved.roundScored, 1, this.config.maxRounds) : null;
      return {
        ...cat,
        score,
        scored,
        scoredDice,
        roundScored
      };
    });

    this.state = {
      ...template,
      dice,
      holds,
      rollsThisRound,
      currentRound,
      categories
    };

    this.updateUpperBonus();
    this.recomputeTotals();
    return this.getState();
  }

  private findCategory(key: CategoryKey) {
    return this.state.categories.find((c) => c.key === key);
  }

  private updateUpperBonus() {
    const bonusCat = this.findCategory('upper-bonus');
    if (!bonusCat) return;
    const upperCats = this.state.categories.filter(
      (c) => c.section === 'upper' && c.key !== 'upper-bonus'
    );
    const allUpperScored = upperCats.every((c) => c.scored);
    if (!allUpperScored) {
      bonusCat.score = null;
      bonusCat.scored = false;
      bonusCat.scoredDice = null;
      bonusCat.roundScored = null;
      return;
    }

    const upperTotal = upperCats.reduce((sum, c) => sum + (c.score ?? 0), 0);
    bonusCat.score = upperTotal >= this.config.upperBonusThreshold ? this.config.upperBonusValue : 0;
    bonusCat.scored = true;
    bonusCat.scoredDice = null;
    bonusCat.roundScored = null;
  }

  private recomputeTotals() {
    const upper = this.state.categories
      .filter((c) => c.section === 'upper' && c.key !== 'upper-bonus')
      .reduce((sum, c) => sum + (c.score ?? 0), 0);
    const lower = this.state.categories
      .filter((c) => c.section === 'lower')
      .reduce((sum, c) => sum + (c.score ?? 0), 0);
    const bonus = this.findCategory('upper-bonus')?.score ?? 0;
    const grand = upper + lower + bonus;
    const completed = this.state.categories
      .filter((c) => c.interactive !== false)
      .every((c) => c.scored);

    this.state.totals = { upper, lower, bonus, grand };
    this.state.completed = completed;
  }

  private advanceRound() {
    if (this.state.completed) {
      this.state.rollsThisRound = 0;
      this.state.dice = this.emptyDice();
      this.state.holds = this.emptyHolds();
      return;
    }

    this.state.currentRound = Math.min(this.state.currentRound + 1, this.config.maxRounds);
    this.state.rollsThisRound = 0;
    this.state.dice = this.emptyDice();
    this.state.holds = this.emptyHolds();
  }

  private requireFullDice() {
    if (this.state.rollsThisRound === 0) {
      throw new Error('Roll the dice before scoring');
    }
    const missing = this.state.dice.findIndex((v) => v === null);
    if (missing >= 0) {
      throw new Error(`Die ${missing + 1} has no value yet`);
    }
    return this.state.dice.map((v) => v!) as number[];
  }

  private createInitialState(): GameState {
    const categories = buildScoreCategories();
    const totals: GameTotals = { upper: 0, lower: 0, bonus: 0, grand: 0 };
    return {
      dice: this.emptyDice(),
      holds: this.emptyHolds(),
      rollsThisRound: 0,
      currentRound: 1,
      maxRounds: this.config.maxRounds,
      maxRolls: this.config.maxRolls,
      categories,
      totals,
      completed: false
    };
  }

  private emptyDice() {
    return Array.from({ length: this.config.diceCount }, () => null as DiceValue);
  }

  private emptyHolds() {
    return Array.from({ length: this.config.diceCount }, () => false);
  }

  private cloneState(): GameState {
    return {
      ...this.state,
      dice: [...this.state.dice],
      holds: [...this.state.holds],
      categories: this.state.categories.map((cat) => ({
        ...cat,
        scoredDice: cat.scoredDice ? [...cat.scoredDice] : null,
        roundScored: cat.roundScored ?? null
      })),
      totals: { ...this.state.totals }
    };
  }
}

export function computeCategoryScore(key: CategoryKey, dice: number[]) {
  const counts = countsByValue(dice);
  const sum = dice.reduce((acc, v) => acc + v, 0);
  switch (key) {
    case 'ones':
    case 'twos':
    case 'threes':
    case 'fours':
    case 'fives':
    case 'sixes': {
      const face = UPPER_CATEGORY_KEYS.indexOf(key) + 1;
      return dice.filter((v) => v === face).reduce((acc, v) => acc + v, 0);
    }
    case 'three-kind':
      return counts.some((c) => c >= 3) ? sum : 0;
    case 'four-kind':
      return counts.some((c) => c >= 4) ? sum : 0;
    case 'full-house':
      return isFullHouse(counts) ? 25 : 0;
    case 'small-straight':
      return hasStraight(dice, 4) ? 30 : 0;
    case 'large-straight':
      return hasStraight(dice, 5) ? 40 : 0;
    case 'yahtzee':
      return counts.some((c) => c === 5) ? 50 : 0;
    case 'chance':
      return sum;
    case 'upper-bonus':
      return 0;
    default:
      return 0;
  }
}

export function buildScoreCategories(): ScoreCategoryState[] {
  return [
    {
      key: 'ones',
      label: 'Ones',
      score: null,
      scored: false,
      section: 'upper',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'twos',
      label: 'Twos',
      score: null,
      scored: false,
      section: 'upper',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'threes',
      label: 'Threes',
      score: null,
      scored: false,
      section: 'upper',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'fours',
      label: 'Fours',
      score: null,
      scored: false,
      section: 'upper',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'fives',
      label: 'Fives',
      score: null,
      scored: false,
      section: 'upper',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'sixes',
      label: 'Sixes',
      score: null,
      scored: false,
      section: 'upper',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'upper-bonus',
      label: 'Upper Bonus',
      score: null,
      scored: false,
      section: 'bonus',
      interactive: false,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'three-kind',
      label: 'Three of a Kind',
      score: null,
      scored: false,
      section: 'lower',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'four-kind',
      label: 'Four of a Kind',
      score: null,
      scored: false,
      section: 'lower',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'full-house',
      label: 'Full House',
      score: null,
      scored: false,
      section: 'lower',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'small-straight',
      label: 'Small Straight',
      score: null,
      scored: false,
      section: 'lower',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'large-straight',
      label: 'Large Straight',
      score: null,
      scored: false,
      section: 'lower',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'yahtzee',
      label: 'Yahtzee',
      score: null,
      scored: false,
      section: 'lower',
      interactive: true,
      scoredDice: null,
      roundScored: null
    },
    {
      key: 'chance',
      label: 'Chance',
      score: null,
      scored: false,
      section: 'lower',
      interactive: true,
      scoredDice: null,
      roundScored: null
    }
  ];
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clampNumberOrNull(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeSavedDice(values: unknown, diceCount: number): DiceValue[] {
  if (!Array.isArray(values)) {
    return Array.from({ length: diceCount }, () => null);
  }
  return Array.from({ length: diceCount }, (_, idx) => normalizeDieValue(values[idx]));
}

function normalizeSavedHolds(values: unknown, diceCount: number): boolean[] {
  if (!Array.isArray(values)) {
    return Array.from({ length: diceCount }, () => false);
  }
  return Array.from({ length: diceCount }, (_, idx) => !!values[idx]);
}

function normalizeScoredDice(values: unknown, diceCount: number): number[] | null {
  if (!Array.isArray(values)) return null;
  const normalized = values
    .slice(0, diceCount)
    .map((value) => normalizeDieValue(value))
    .filter((value): value is number => typeof value === 'number');
  return normalized.length ? normalized : null;
}

function normalizeDieValue(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (rounded < 1 || rounded > 6) return null;
  return rounded;
}

function countsByValue(dice: number[]) {
  const counts = [0, 0, 0, 0, 0, 0];
  dice.forEach((v) => {
    if (v >= 1 && v <= 6) {
      counts[v - 1] += 1;
    }
  });
  return counts;
}

function isFullHouse(counts: number[]) {
  const hasThree = counts.some((c) => c === 3);
  const hasTwo = counts.some((c) => c === 2);
  const isYahtzee = counts.some((c) => c === 5);
  return (hasThree && hasTwo) || isYahtzee;
}

function hasStraight(dice: number[], length: number) {
  const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === unique[i - 1] + 1) {
      streak += 1;
      if (streak >= length) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}
