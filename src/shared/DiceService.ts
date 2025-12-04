import DiceBox from '@3d-dice/dice-box';

const DICE_BOX_DEFAULT_COLOR = '#3b82f6';
const DICE_BOX_HELD_COLOR = '#22c55e';

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
const DIE_COUNT = 5;

type NormalizedDie = Pick<GameDie, 'value' | 'sides' | 'groupId' | 'rollId'>;

export function mergeRollResults({
  previous,
  results,
  rerollIndices
}: {
  previous: GameDie[];
  results: NormalizedDie[];
  rerollIndices: number[];
}) {
  const next = previous.map((die) => ({ ...die }));
  const rerollQueue = [...rerollIndices];
  const usedIndices = new Set<number>();
  const idToIndex = new Map<string, number>();

  const idKey = (die: { groupId: string; rollId: string }) => `${die.groupId}|${die.rollId}`;

  next.forEach((die, idx) => {
    idToIndex.set(idKey(die), idx);
  });

  const takeTargetIndex = () => {
    if (rerollQueue.length) {
      const idx = rerollQueue.shift()!;
      usedIndices.add(idx);
      return idx;
    }
    const fallback = next.findIndex((die, idx) => !usedIndices.has(idx) && die && !die.held);
    if (fallback >= 0) {
      usedIndices.add(fallback);
      return fallback;
    }
    return null;
  };

  results.forEach((die) => {
    const matchIdx = idToIndex.get(idKey(die));
    if (typeof matchIdx === 'number') {
      next[matchIdx] = { ...next[matchIdx], value: die.value, sides: die.sides };
      usedIndices.add(matchIdx);
      return;
    }
    const targetIdx = takeTargetIndex();
    if (targetIdx === null) return;
    next[targetIdx] = {
      index: targetIdx,
      value: die.value,
      sides: die.sides,
      held: false,
      groupId: die.groupId,
      rollId: die.rollId
    };
  });

  return Array.from({ length: DIE_COUNT }, (_, idx) =>
    next[idx] ? { ...next[idx], index: idx } : buildEmptyDie(idx, `${Date.now()}`)
  );
}

function buildEmptyDie(index: number, seed?: string): GameDie {
  const suffix = seed ? `${index}-${seed}` : `${index}`;
  return {
    index,
    value: 0,
    sides: 6,
    held: false,
    groupId: '-1',
    rollId: `placeholder-${suffix}`
  };
}

function buildEmptyDice(): GameDie[] {
  return Array.from({ length: DIE_COUNT }, (_, index) => buildEmptyDie(index));
}

export class DiceService {
  private diceBox: any;
  private dice: GameDie[] = [];
  private rollsThisRound = 0;
  private rolling = false;
  private disposed = false;
  private listeners: ChangeListener[] = [];
  private pendingRerollIndices: number[] = [];
  private containerSelector: string;
  private containerEl: HTMLElement | null = null;
  private pointerListener: ((ev: PointerEvent) => void) | null = null;
  private windowPointerListener: ((ev: PointerEvent) => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private heldVisualsWarned = false;

  constructor(containerSelector = '#dice-box') {
    this.containerSelector = containerSelector;
    const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
    const assetPath = `${base}assets/dice-box/`;
    console.info('[DiceService] configuring DiceBox', { assetPath, containerSelector });

    this.diceBox = new DiceBox({
      assetPath,
      container: containerSelector,
      scale: 5, // slightly smaller to fit full-height viewport
      delay: 6,
      offscreen: false,
      themeColor: DICE_BOX_DEFAULT_COLOR,
      onDiePicked: (hit: any) => this.handlePickedDie(hit)
    });

    this.diceBox.onRollComplete = (rollResult: any) => {
      this.handleRollComplete(rollResult);
    };
  }

  async init() {
    console.info('[DiceService] init start');
    await this.diceBox.init();
    if (typeof document !== 'undefined') {
      this.containerEl = document.querySelector(this.containerSelector) as HTMLElement | null;
      if (this.containerEl) {
        this.syncCanvasSize();
        if (typeof ResizeObserver !== 'undefined') {
          this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
          this.resizeObserver.observe(this.containerEl);
        }

        this.pointerListener = (event: PointerEvent) => {
          const hit = this.pickFromPointer(event);
          if (hit?.hit) {
            event.preventDefault();
            event.stopPropagation();
          }
        };
        this.containerEl.addEventListener('pointerdown', this.pointerListener, { passive: false });

        this.windowPointerListener = (event: PointerEvent) => {
          const hit = this.pickFromPointer(event, { strictBounds: true });
          if (hit?.hit) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        };
        window.addEventListener('pointerdown', this.windowPointerListener, {
          passive: false,
          capture: true
        });
      }
    }
    console.info('[DiceService] init complete');
    this.logViewportMetrics('init');
    this.emitChange();
  }

  dispose() {
    this.disposed = true;
    if (this.diceBox?.clear) {
      this.diceBox.clear();
    }
    if (this.containerEl && this.pointerListener) {
      this.containerEl.removeEventListener('pointerdown', this.pointerListener);
    }
    if (this.windowPointerListener) {
      window.removeEventListener('pointerdown', this.windowPointerListener, true);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.pointerListener = null;
    this.windowPointerListener = null;
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
    const currentIds = this.dice.map((die) => die.rollId);
    this.rollsThisRound = 0;
    this.rolling = false;
    this.dice = buildEmptyDice();
    this.pendingRerollIndices = [];
    console.info('[DiceService] startNewRound -> reset state');
    if (currentIds.length && this.diceBox?.setHeldState) {
      this.applyHeldVisuals(currentIds, false);
    }
    this.syncHeldVisuals();
    this.emitChange();
  }

  async rollAll() {
    if (this.guardRollStart('rollAll')) return;
    this.logViewportMetrics('before-rollAll');
    this.rollsThisRound += 1;
    this.rolling = true;
    this.pendingRerollIndices = [];
    this.emitChange();
    console.info(`[DiceService] rollAll -> roll ${DIE_COUNT}d6`, {
      rollsThisRound: this.rollsThisRound,
      diceCount: DIE_COUNT
    });
    try {
      await this.diceBox.roll(`${DIE_COUNT}d6`);
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
    this.logViewportMetrics('before-reroll');
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
    this.syncHeldVisuals();
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

    const rawMapped = rawDice.slice(0, DIE_COUNT).map((die: any) => {
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
      this.dice = mergeRollResults({
        previous: this.dice,
        results: rawMapped,
        rerollIndices: this.pendingRerollIndices
      });
    }

    this.pendingRerollIndices = [];
    this.rolling = false;
    console.debug('[DiceService] roll complete -> snapshot', this.getSnapshot());
    this.logViewportMetrics('roll-complete');
    this.syncHeldVisuals();
    this.emitChange();
  }

  private pickFromPointer(event: PointerEvent, options?: { strictBounds?: boolean }) {
    if (!this.containerEl || this.disposed || this.rolling) return null;
    if (!this.diceBox?.pickDieAt && !this.diceBox?.pickDieFromPointer) return null;

    const viewport = this.containerEl.closest('.dice-viewport') as HTMLElement | null;
    const pointerX = Math.round(event.clientX);
    const pointerY = Math.round(event.clientY);
    const strict = !!options?.strictBounds;
    const log = (level: 'debug' | 'warn', reason: string, data: Record<string, unknown> = {}) => {
      const payload = {
        strict,
        pointer: `${pointerX},${pointerY}`,
        ...data
      };
      console[level](`[DiceService] pickFromPointer ${reason}`, payload);
    };

    if (viewport) {
      const style = getComputedStyle(viewport);
      if (style.pointerEvents === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        log('debug', 'skip viewport non-interactive', {
          style: `${style.pointerEvents}/${style.visibility}/${style.opacity}`
        });
        return null;
      }
    }

    const canvas = this.containerEl.querySelector('canvas') as HTMLCanvasElement | null;
    const canvasRect = (canvas || this.containerEl).getBoundingClientRect();
    const clampedX = Math.max(canvasRect.left + 0.5, Math.min(event.clientX, canvasRect.right - 0.5));
    const clampedY = Math.max(canvasRect.top + 0.5, Math.min(event.clientY, canvasRect.bottom - 0.5));
    const tolerance = options?.strictBounds ? 4 : 32;

    const canvasRectData = {
      left: Math.round(canvasRect.left),
      right: Math.round(canvasRect.right),
      top: Math.round(canvasRect.top),
      bottom: Math.round(canvasRect.bottom)
    };
    const clampedData = { x: Math.round(clampedX), y: Math.round(clampedY) };
    const commonLog = {
      canvas: `${canvasRectData.left},${canvasRectData.top} -> ${canvasRectData.right},${canvasRectData.bottom}`,
      clamped: `${clampedData.x},${clampedData.y}`,
      tolerance
    };

    if (typeof this.diceBox.pickDieAt === 'function') {
      const result = this.diceBox.pickDieAt(clampedX, clampedY);
      if (result?.hit) {
        log('debug', 'hit pickDieAt', { rollId: result?.rollId, ...commonLog });
        return result;
      }
      const offsets = [-24, -16, -8, -4, 0, 4, 8, 16, 24];
      for (const dx of offsets) {
        for (const dy of offsets) {
          if (dx === 0 && dy === 0) continue;
          const ox = Math.max(
            canvasRect.left - tolerance,
            Math.min(clampedX + dx, canvasRect.right + tolerance)
          );
          const oy = Math.max(
            canvasRect.top - tolerance,
            Math.min(clampedY + dy, canvasRect.bottom + tolerance)
          );
          const retry = this.diceBox.pickDieAt(ox, oy);
          if (retry?.hit) {
            log('debug', 'hit pickDieAt fallback', {
              rollId: retry.rollId,
              dx,
              dy,
              ox: Math.round(ox),
              oy: Math.round(oy),
              ...commonLog
            });
            return retry;
          }
        }
      }
      log('warn', 'MISS pickDieAt', { rollId: result?.rollId, ...commonLog });
      return result;
    }
    const result = this.diceBox.pickDieFromPointer?.(event) ?? null;
    log(result?.hit ? 'debug' : 'warn', result?.hit ? 'hit pickDieFromPointer' : 'MISS pickDieFromPointer', {
      rollId: result?.rollId,
      ...commonLog
    });
    return result;
  }

  private normalizeValue(value: any) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    if (num < 1) return 0;
    if (num > 6) return Math.round(num) % 6 || 6;
    return Math.round(num);
  }

  private handlePickedDie(hit: { hit?: boolean; rollId?: string | number }) {
    if (!hit?.hit || hit.rollId === undefined || hit.rollId === null || this.rolling) return;
    const idx = this.dice.findIndex((d) => d.rollId === String(hit.rollId));
    if (idx < 0) {
      console.warn('[DiceService] handlePickedDie -> rollId not found', { rollId: hit.rollId });
      return;
    }
    console.debug('[DiceService] handlePickedDie -> toggleHold', { rollId: hit.rollId, index: idx });
    this.toggleHold(idx);
  }

  private syncHeldVisuals() {
    if (!this.diceBox?.setHeldState) {
      if (!this.heldVisualsWarned) {
        console.warn('[DiceService] setHeldState unavailable; cannot sync held visuals');
        this.heldVisualsWarned = true;
      }
      return;
    }

    const heldIds = this.dice.filter((d) => d.held && d.rollId).map((d) => d.rollId);
    const unheldIds = this.dice.filter((d) => !d.held && d.rollId).map((d) => d.rollId);
    if (unheldIds.length) {
      this.applyHeldVisuals(unheldIds, false);
    }
    if (heldIds.length) {
      this.applyHeldVisuals(heldIds, true);
    }
  }

  private applyHeldVisuals(ids: string[], held: boolean) {
    if (!ids.length || !this.diceBox?.setHeldState) return;
    try {
      this.diceBox.setHeldState({
        ids,
        held,
        scale: held ? 1.08 : 1,
        color: held ? DICE_BOX_HELD_COLOR : DICE_BOX_DEFAULT_COLOR
      });
    } catch (err) {
      console.warn('[DiceService] setHeldState failed', { held, count: ids.length, err });
    }
  }

  private normalizeIds(die: any) {
    return {
      groupId: String(die?.groupId ?? '0'),
      rollId: String(die?.rollId ?? die?.id ?? `die-${Math.random()}`)
    };
  }

  private syncCanvasSize() {
    if (!this.containerEl) return;
    const canvas = this.containerEl.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const desiredWidth = Math.round(rect.width);
    const desiredHeight = Math.round(rect.height);
    const currentWidth = canvas.width || 0;
    const currentHeight = canvas.height || 0;
    if (!desiredWidth || !desiredHeight) return;
    if (desiredWidth === currentWidth && desiredHeight === currentHeight) return;

    canvas.width = desiredWidth;
    canvas.height = desiredHeight;
    console.info('[DiceService] syncCanvasSize', {
      desiredWidth,
      desiredHeight,
      currentWidth,
      currentHeight
    });
    try {
      this.diceBox?.resize?.();
    } catch {
      // ignore if diceBox lacks resize
    }
  }

  private emitChange() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((cb) => cb(snapshot));
  }

  private logViewportMetrics(tag: string) {
    if (typeof document === 'undefined') return;
    const container = document.querySelector(this.containerSelector) as HTMLElement | null;
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
    const containerRect = container?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    const layer = container?.closest('.dice-viewport') as HTMLElement | null;
    const layerRect = layer?.getBoundingClientRect();
    const metrics = {
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      layerRect: layerRect
        ? {
            width: Math.round(layerRect.width),
            height: Math.round(layerRect.height),
            top: Math.round(layerRect.top),
            left: Math.round(layerRect.left)
          }
        : null,
      containerRect: containerRect
        ? {
            width: Math.round(containerRect.width),
            height: Math.round(containerRect.height),
            top: Math.round(containerRect.top),
            left: Math.round(containerRect.left)
          }
        : null,
      canvasRect: canvasRect
        ? {
            width: Math.round(canvasRect.width),
            height: Math.round(canvasRect.height),
            top: Math.round(canvasRect.top),
            left: Math.round(canvasRect.left)
          }
        : null,
      canvasStyle: canvasStyle
        ? {
            width: canvasStyle.width,
            height: canvasStyle.height,
            transform: canvasStyle.transform,
            top: canvasStyle.top,
            left: canvasStyle.left
          }
        : null
    };

    console.info(`[DiceService] viewport metrics (${tag})`, metrics);

    const summaryParts = [
      metrics.layerRect
        ? `layer ${metrics.layerRect.width}x${metrics.layerRect.height} @ (${metrics.layerRect.left},${metrics.layerRect.top})`
        : null,
      metrics.containerRect
        ? `container ${metrics.containerRect.width}x${metrics.containerRect.height} @ (${metrics.containerRect.left},${metrics.containerRect.top})`
        : null,
      metrics.canvasRect
        ? `canvas ${metrics.canvasRect.width}x${metrics.canvasRect.height} @ (${metrics.canvasRect.left},${metrics.canvasRect.top})`
        : null,
      metrics.canvasStyle ? `canvas style h=${metrics.canvasStyle.height} top=${metrics.canvasStyle.top}` : null,
      metrics.window
        ? `window ${metrics.window.innerWidth}x${metrics.window.innerHeight} dpr=${metrics.window.devicePixelRatio}`
        : null
    ].filter(Boolean);
    if (summaryParts.length) {
      console.info(`[DiceService] viewport summary (${tag})`, summaryParts.join(' | '));
    }
  }
}
