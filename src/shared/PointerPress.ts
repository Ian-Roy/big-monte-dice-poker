import Phaser from 'phaser';

/**
 * Bind a press handler that works for both mouse (on release) and touch/pen (on down)
 * without firing twice when browsers synthesize clicks from taps.
 */
export function bindPress(target: Phaser.GameObjects.GameObject, handler: () => void) {
  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    const pointerEvent = pointer.event as PointerEvent | undefined;
    const touchLike = pointer.wasTouch || pointerEvent?.pointerType === 'touch' || pointerEvent?.pointerType === 'pen';
    if (touchLike) {
      handler();
    }
  });

  target.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    const pointerEvent = pointer.event as PointerEvent | undefined;
    const touchLike = pointer.wasTouch || pointerEvent?.pointerType === 'touch' || pointerEvent?.pointerType === 'pen';
    if (!touchLike) {
      handler();
    }
  });
}
