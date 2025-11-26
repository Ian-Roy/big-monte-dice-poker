import Phaser from 'phaser';

type DieVisual = {
  container: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Image;
  lockIcon: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
  index: number;
};

export class PhaserDiceManager {
  private dice: DieVisual[] = [];
  private rolling = false;
  private onToggleLock?: (idx: number) => void;

  constructor(private scene: Phaser.Scene, onToggleLock?: (idx: number) => void) {
    this.onToggleLock = onToggleLock;
  }

  createDiceSet(areaWidth: number, areaHeight: number) {
    this.generateDieTextures();
    const originX = areaWidth / 2;
    const originY = areaHeight / 2 + 30;
    const spacing = 130;
    const positions = [
      { x: originX - spacing, y: originY - spacing / 2 },
      { x: originX, y: originY - spacing },
      { x: originX + spacing, y: originY - spacing / 2 },
      { x: originX - spacing / 2, y: originY + spacing / 2 },
      { x: originX + spacing / 2, y: originY + spacing / 2 }
    ];

    positions.forEach((pos, idx) => {
      const face = this.scene.add.image(pos.x, pos.y, 'die-face-blank').setScale(1.05).setDepth(5);
      const lockIcon = this.scene.add
        .text(pos.x, pos.y - 42, 'LOCKED', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#ffc857'
        })
        .setOrigin(0.5)
        .setAlpha(0);
     const hitArea = this.scene.add.rectangle(pos.x, pos.y, sizeForHit(), sizeForHit(), 0xffffff, 0).setInteractive({
        useHandCursor: true
      });
      hitArea.on('pointerup', () => {
        if (this.onToggleLock) this.onToggleLock(idx);
      });

      const container = this.scene.add.container(0, 0, [face, lockIcon, hitArea]);
      container.setDepth(5 + idx);
      this.dice.push({ container, face, lockIcon, hitArea, index: idx });
    });

    function sizeForHit() {
      return 110;
    }
  }

  async roll(unlockedIndices: number[]): Promise<number[]> {
    if (this.rolling) return [];
    this.rolling = true;
    const results: number[] = [];
    const animations: Promise<void>[] = [];

    unlockedIndices.forEach((idx) => {
      const die = this.dice[idx];
      if (!die) return;
      const target = Phaser.Math.Between(1, 6);
      results.push(target);

      animations.push(
        new Promise((resolve) => {
          const jitter = this.scene.time.addEvent({
            delay: 90,
            repeat: 6,
            callback: () => {
              const v = Phaser.Math.Between(1, 6);
              die.face.setTexture(`die-face-${v}`);
              die.face.setAngle(Phaser.Math.Between(-15, 15));
            }
          });

          this.scene.tweens.add({
            targets: die.face,
            scale: { from: 1, to: 1.08 },
            yoyo: true,
            duration: 120,
            repeat: 3
          });

          this.scene.time.delayedCall(750, () => {
            die.face.setTexture(`die-face-${target}`);
            die.face.setAngle(0);
            resolve();
          });
        })
      );
    });

    await Promise.all(animations);
    this.rolling = false;
    return results;
  }

  updateState(values: Array<number | null>, locks: boolean[]) {
    values.forEach((v, idx) => {
      const die = this.dice[idx];
      if (!die) return;
      if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6) {
        die.face.setTexture(`die-face-${v}`);
      } else {
        die.face.setTexture('die-face-blank');
      }
      const locked = !!locks[idx];
      die.lockIcon.setAlpha(locked ? 1 : 0);
      die.face.setTint(locked ? 0xffd27f : 0xffffff);
    });
  }

  private generateDieTextures() {
    const size = 96;
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
