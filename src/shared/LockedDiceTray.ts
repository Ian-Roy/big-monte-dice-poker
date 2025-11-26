import { diceState, DiceStateEvent, type DiceSnapshot } from './DiceState';

const trayId = 'locked-dice-tray';

export function setupLockedDiceTray() {
  renderTray(diceState.getState());

  diceState.on(DiceStateEvent.Change, renderTray);
}

function renderTray(state: DiceSnapshot) {
  const tray = document.getElementById(trayId);
  if (!tray) return;

  // Clear
  while (tray.firstChild) tray.removeChild(tray.firstChild);

  const title = document.createElement('div');
  title.className = 'locked-dice-tray__title';
  title.textContent = 'Locked Dice';
  tray.appendChild(title);

  const locked = state.locks
    .map((locked, idx) => ({ locked, idx }))
    .filter((d) => d.locked);

  if (!locked.length) {
    const empty = document.createElement('div');
    empty.className = 'locked-dice-tray__empty';
    empty.textContent = 'Click a die to lock it. Locked dice stay out of rerolls.';
    tray.appendChild(empty);
    return;
  }

  locked.forEach(({ idx }) => {
    const value = state.values[idx];
    const item = document.createElement('div');
    item.className = 'locked-die';

    const face = createDiceFace(value);
    const meta = document.createElement('div');
    const id = document.createElement('div');
    id.className = 'locked-die__id';
    id.textContent = `Die ${idx + 1}`;
    const val = document.createElement('div');
    val.className = 'locked-die__value';
    val.textContent = typeof value === 'number' ? `${value}` : '-';

    meta.appendChild(id);
    meta.appendChild(val);
    item.appendChild(face);
    item.appendChild(meta);
    tray.appendChild(item);
  });
}

function createDiceFace(value: unknown) {
  const face = document.createElement('div');
  face.className = 'dice-face';

  const pipLayouts: Record<number, string[]> = {
    1: ['pip-mid'],
    2: ['pip-tl', 'pip-br'],
    3: ['pip-tl', 'pip-mid', 'pip-br'],
    4: ['pip-tl', 'pip-tr', 'pip-bl', 'pip-br'],
    5: ['pip-tl', 'pip-tr', 'pip-mid', 'pip-bl', 'pip-br'],
    6: ['pip-tl', 'pip-tr', 'pip-ml', 'pip-mr', 'pip-bl', 'pip-br']
  };

  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6) {
    const layout = pipLayouts[value] ?? [];
    layout.forEach((cls) => {
      const pip = document.createElement('div');
      pip.className = `dice-face__pip ${cls}`;
      face.appendChild(pip);
    });
  } else {
    const unknown = document.createElement('div');
    unknown.className = 'locked-die__value';
    unknown.textContent = '?';
    face.appendChild(unknown);
  }

  return face;
}
