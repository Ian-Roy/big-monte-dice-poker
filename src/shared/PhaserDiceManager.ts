import Phaser from 'phaser';
import { bindPress } from './PointerPress';

type LockSlot = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  face: Phaser.GameObjects.Image;
  lockTag: Phaser.GameObjects.Text;
  heldOverlay: Phaser.GameObjects.Rectangle;
  index: number;
};

export class PhaserDiceManager {
  private slots: LockSlot[] = [];
  private rollPulse?: Phaser.Tweens.Tween;
  private onToggleLock?: (idx: number) => void;
  private readonly debug: boolean;

  constructor(private scene: Phaser.Scene, onToggleLock?: (idx: number) => void) {
    this.onToggleLock = onToggleLock;
    this.debug = !!import.meta.env.DEV;
  }

  createLockRow(areaWidth: number, options: { rowY: number; top?: number }) {
    this.generateDieTextures();
    const centerX = areaWidth / 2;
    const rowY = options.rowY;
    const slotWidth = Math.min(130, areaWidth * 0.16);
    const slotHeight = 96;
    const spacing = slotWidth + 16;
    const startX = centerX - spacing * 2;

    for (let idx = 0; idx < 5; idx++) {
      const x = startX + idx * spacing;
      const bg = this.scene.add
        .rectangle(x, rowY, slotWidth, slotHeight, 0x0f2636, 0.9)
        .setStrokeStyle(2, 0x7ad3ff, 0.7)
        .setDepth(6);
      const heldOverlay = this.scene.add
        .rectangle(x, rowY, slotWidth, slotHeight, 0x22c55e, 0.12)
        .setVisible(false)
        .setDepth(6);
      const face = this.scene.add
        .image(x, rowY - 8, 'die-face-blank')
        .setDisplaySize(62, 62)
        .setDepth(7);
      const lockTag = this.scene.add
        .text(x, rowY + slotHeight / 2 - 16, 'Unlocked', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#b7e2ff'
        })
        .setOrigin(0.5, 0.5)
        .setDepth(7);

      const hitArea = this.scene
        .add.rectangle(x, rowY, slotWidth, slotHeight, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(8);
      bindPress(hitArea, () => {
        if (this.onToggleLock) this.onToggleLock(idx);
      });

      if (this.debug) {
        hitArea.setStrokeStyle(1, 0x7ad3ff, 0.15);
      }

      const container = this.scene.add.container(0, 0, [bg, heldOverlay, face, lockTag, hitArea]);
      container.setDepth(6 + idx * 0.01);
      this.slots.push({ container, bg, face, lockTag, heldOverlay, index: idx });
    }
  }

  updateState(values: Array<number | null>, locks: boolean[]) {
    values.forEach((v, idx) => {
      const slot = this.slots[idx];
      if (!slot) return;
      const locked = !!locks[idx];
      if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6) {
        slot.face.setTexture(`die-face-${v}`);
      } else {
        slot.face.setTexture('die-face-blank');
      }
      slot.bg.setFillStyle(locked ? 0x0f331f : 0x0f2636, 0.92);
      slot.bg.setStrokeStyle(2, locked ? 0x22c55e : 0x7ad3ff, locked ? 0.95 : 0.7);
      slot.lockTag.setText(locked ? 'Held' : 'Unlocked');
      slot.lockTag.setColor(locked ? '#8ef0b2' : '#b7e2ff');
      slot.heldOverlay.setVisible(locked);
      // Keep position/scale fixed to avoid jarring lock movement
      slot.container.setScale(1);
    });
  }

  pulseRollStart() {
    if (this.rollPulse) {
      this.rollPulse.stop();
      this.rollPulse = undefined;
    }
    if (!this.slots.length) return;
    this.rollPulse = this.scene.tweens.add({
      targets: this.slots.map((slot) => slot.bg),
      scale: { from: 1.0, to: 1.05 },
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut'
    });
  }

  setRolling(isRolling: boolean) {
    if (isRolling) {
      this.pulseRollStart();
    } else if (this.rollPulse) {
      this.rollPulse.stop();
      this.rollPulse = undefined;
    }
  }

  private generateDieTextures() {
    const size = 88;
    const center = size / 2;
    const offset = Math.floor(size * 0.24); // pip offset from center
    const pipRadius = 7;
    const pipPositions: Record<number, { x: number; y: number }[]> = {
      1: [{ x: 0, y: 0 }],
      2: [
        { x: -offset, y: -offset },
        { x: offset, y: offset }
      ],
      3: [
        { x: -offset, y: -offset },
        { x: 0, y: 0 },
        { x: offset, y: offset }
      ],
      4: [
        { x: -offset, y: -offset },
        { x: offset, y: -offset },
        { x: -offset, y: offset },
        { x: offset, y: offset }
      ],
      5: [
        { x: -offset, y: -offset },
        { x: offset, y: -offset },
        { x: 0, y: 0 },
        { x: -offset, y: offset },
        { x: offset, y: offset }
      ],
      6: [
        { x: -offset, y: -offset },
        { x: offset, y: -offset },
        { x: -offset, y: 0 },
        { x: offset, y: 0 },
        { x: -offset, y: offset },
        { x: offset, y: offset }
      ]
    };

    for (let v = 1; v <= 6; v++) {
      const g = this.scene.add.graphics();
      g.fillStyle(0x1b2c3d, 1);
      g.fillRoundedRect(0, 0, size, size, 14);
      g.lineStyle(4, 0x7ad3ff, 0.9);
      g.strokeRoundedRect(0, 0, size, size, 14);

      g.fillStyle(0xffffff, 0.95);
      pipPositions[v].forEach(({ x, y }) => {
        g.fillCircle(center + x, center + y, pipRadius);
      });

      g.generateTexture(`die-face-${v}`, size, size);
      g.destroy();
    }

    // Blank texture
    const blank = this.scene.add.graphics();
    blank.fillStyle(0x0f1b2a, 0.9);
    blank.fillRoundedRect(0, 0, size, size, 14);
    blank.lineStyle(4, 0x7ad3ff, 0.35);
    blank.strokeRoundedRect(0, 0, size, size, 14);
    blank.generateTexture('die-face-blank', size, size);
    blank.destroy();
  }
}
