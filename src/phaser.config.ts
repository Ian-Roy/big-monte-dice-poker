import Phaser from 'phaser';

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-root',
  backgroundColor: '#062335',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768
  },
  input: {
    activePointers: 3,
    touch: { capture: true },
    mouse: {
      preventDefaultDown: true,
      preventDefaultUp: true,
      preventDefaultMove: true
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  render: {
    pixelArt: true,
    antialias: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};
