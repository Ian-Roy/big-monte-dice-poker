import DiceBox from '@3d-dice/dice-box';

export type GameDie = {
  index: number;
  value: number;
  sides: number;
  held: boolean;
  groupId: string;
  rollId: string;
};

export type DiceServiceSnapshot = {
  dice: GameDie[];
  rollsThisRound: number;
  isRolling: boolean;
};

type ChangeListener = (snapshot: DiceServiceSnapshot) => void;

const MAX_ROLLS_PER_ROUND = 3;

export class DiceService {
  private diceBox: any;
  private dice: GameDie[] = [];
  private rollsThisRound = 0;
  private rolling = false;
  private disposed = false;
  private listeners: ChangeListener[] = [];
  private pendingRerollIndices: number[] = [];

  constructor(containerSelector = '#dice-box') {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
    const assetPath = `${base}assets/dice-box/`;
    console.info('[DiceService] configuring DiceBox', { assetPath, containerSelector });

    this.diceBox = new DiceBox({
      assetPath,
      container: containerSelector,
      scale: 10, // make dice render larger
      delay: 6
    });

    this.diceBox.onRollComplete = (rollResult: any) => {
      this.handleRollComplete(rollResult);
    };
  }

  async init() {
    console.info('[DiceService] init start');
    await this.diceBox.init();
    console.info('[DiceService] init complete');
    this.emitChange();
  }

  dispose() {
    this.disposed = true;
    if (this.diceBox?.clear) {
      this.diceBox.clear();
    }
    this.diceBox = undefined;
    this.listeners = [];
  }

  onChange(listener: ChangeListener) {
    this.listeners.push(listener);
    // Immediately provide the latest snapshot so UI can initialize
    listener(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getSnapshot(): DiceServiceSnapshot {
    return {
      dice: this.dice.map((die) => ({ ...die })),
      rollsThisRound: this.rollsThisRound,
      isRolling: this.rolling
    };
  }

  allValues() {
    return this.dice.map((die) => die.value);
  }

  startNewRound() {
    this.rollsThisRound = 0;
    this.rolling = false;
    this.dice = this.buildEmptyDice();
    this.pendingRerollIndices = [];
    console.info('[DiceService] startNewRound -> reset state');
    this.emitChange();
  }

  async rollAll() {
    if (this.guardRollStart('rollAll')) return;
    this.rollsThisRound += 1;
    this.rolling = true;
    this.pendingRerollIndices = [];
    this.emitChange();
    console.info('[DiceService] rollAll -> roll 5d6', { rollsThisRound: this.rollsThisRound });
    try {
      await this.diceBox.roll('5d6');
    } catch (err) {
      this.rolling = false;
      this.rollsThisRound = Math.max(0, this.rollsThisRound - 1);
      this.emitChange();
      throw err;
    }
  }

  async rerollUnheld() {
    if (this.rollsThisRound === 0) {
      return this.rollAll();
    }
    if (this.guardRollStart('rerollUnheld')) return;

    const toReroll = this.dice.filter((die) => !die.held);
    if (!toReroll.length) {
      console.warn('[DiceService] rerollUnheld -> no unlocked dice to reroll');
      return;
    }

    this.rollsThisRound += 1;
    this.rolling = true;
    this.emitChange();
    const targets = toReroll
      .filter((die) => die.rollId && die.groupId && die.value > 0)
      .map((die) => ({
        groupId: die.groupId,
        rollId: die.rollId,
        sides: die.sides || 6
      }));
    if (!targets.length) {
      console.warn('[DiceService] rerollUnheld -> no valid dice to reroll after filtering');
      this.rolling = false;
      this.emitChange();
      return;
    }
    console.info('[DiceService] rerollUnheld -> reroll subset', {
      rollsThisRound: this.rollsThisRound,
      toReroll: targets
    });

    // Remember which indices we asked to reroll; if Dice-Box changes IDs we map by this order.
    this.pendingRerollIndices = toReroll.map((d) => d.index);

    try {
      await this.diceBox.reroll(targets, { remove: true, newStartPoint: true });
    } catch (err) {
      this.rolling = false;
      this.rollsThisRound = Math.max(0, this.rollsThisRound - 1);
      this.emitChange();
      throw err;
    }
  }

  toggleHold(index: number) {
    const die = this.dice[index];
    if (!die) return;
    if (this.rollsThisRound === 0) {
      console.warn('[DiceService] toggleHold ignored before first roll', { index });
      return;
    }
    die.held = !die.held;
    console.debug('[DiceService] toggleHold', { index, held: die.held, value: die.value });
    this.emitChange();
  }

  private guardRollStart(action: string) {
    if (this.disposed) {
      console.warn('[DiceService] ignoring action on disposed service', { action });
      return true;
    }
    if (this.rolling) {
      console.warn('[DiceService] ignoring action while rolling', { action });
      return true;
    }
    if (this.rollsThisRound >= MAX_ROLLS_PER_ROUND) {
      console.warn('[DiceService] max rolls reached', { action, rollsThisRound: this.rollsThisRound });
      return true;
    }
    return false;
  }

  private handleRollComplete(rollResult: any) {
    console.info('[DiceService] onRollComplete payload', rollResult);
    const groups = Array.isArray(rollResult) ? rollResult : [rollResult];
    const primaryGroup = groups[0] || {};
    const rawDice = Array.isArray(primaryGroup.rolls)
      ? primaryGroup.rolls
      : Array.isArray(primaryGroup.dice)
        ? primaryGroup.dice
        : [];

    if (!rawDice.length) {
      console.warn('[DiceService] rollComplete had no dice results', { rollResult });
      this.rolling = false;
      this.emitChange();
      return;
    }

    const rawMapped = rawDice.slice(0, 5).map((die: any) => {
      const { groupId, rollId } = this.normalizeIds(die);
      return {
        value: this.normalizeValue(die.value),
        sides: die.sides ?? 6,
        groupId,
        rollId
      };
    });

    const isFirstRoll = this.rollsThisRound === 1 || this.dice.length === 0;

    if (isFirstRoll) {
      this.dice = rawMapped.map((die, index) => ({
        index,
        value: die.value,
        sides: die.sides,
        held: false,
        groupId: die.groupId,
        rollId: die.rollId
      }));
    } else {
      const next = [...this.dice];
      const pending = [...this.pendingRerollIndices];

      rawMapped.forEach((die) => {
        const matchIdx = next.findIndex(
          (d) => d && d.groupId === die.groupId && d.rollId === die.rollId
        );
        if (matchIdx >= 0) {
          next[matchIdx] = { ...next[matchIdx], value: die.value, sides: die.sides };
        } else {
          // Map unexpected IDs to the indices we requested, in order; fallback to first unlocked.
          const targetIdx = pending.length ? pending.shift()! : next.findIndex((d) => d && !d.held);
          console.warn('[DiceService] reroll result had no matching die; reassigning', {
            die,
            targetIdx
          });
          const safeIdx = targetIdx >= 0 ? targetIdx : 0;
          next[targetIdx] = {
            index: safeIdx,
            value: die.value,
            sides: die.sides,
            held: false,
            groupId: die.groupId,
            rollId: die.rollId
          };
        }
      });

      this.dice = next.map((die, idx) =>
        die
          ? { ...die, index: idx }
          : {
              index: idx,
              value: 0,
              sides: 6,
              held: false,
              groupId: '-1',
              rollId: `placeholder-${idx}-${Date.now()}`
            }
      );
    }

    this.pendingRerollIndices = [];
    this.rolling = false;
    console.debug('[DiceService] roll complete -> snapshot', this.getSnapshot());
    this.emitChange();
  }

  private normalizeValue(value: any) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    if (num < 1) return 0;
    if (num > 6) return Math.round(num) % 6 || 6;
    return Math.round(num);
  }

  private buildEmptyDice(): GameDie[] {
    return Array.from({ length: 5 }, (_, index) => ({
      index,
      value: 0,
      sides: 6,
      held: false,
      groupId: '-1',
      rollId: `placeholder-${index}`
    }));
  }

  private normalizeIds(die: any) {
    return {
      groupId: String(die?.groupId ?? '0'),
      rollId: String(die?.rollId ?? die?.id ?? `die-${Math.random()}`)
    };
  }

  private emitChange() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((cb) => cb(snapshot));
  }
}
