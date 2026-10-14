import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isHapticsSupported,
  isHapticsEnabled,
  setHapticsEnabled,
  triggerHaptic,
  hapticTick,
  hapticYourTurn,
  hapticEliminated,
} from './haptics';

describe('Haptics Tactical Feedback System', () => {
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  beforeEach(() => {
    setHapticsEnabled(true);
  });

  afterEach(() => {
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDesc);
    }
  });

  it('safely handles environments without navigator.vibrate without throwing', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });
    assert.equal(isHapticsSupported(), false);
    assert.equal(hapticTick(), false);
    assert.equal(hapticYourTurn(), false);
    assert.equal(hapticEliminated(), false);
  });

  it('triggers vibration on supported browsers when enabled', () => {
    let calledPattern: any = null;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: (pattern: any) => {
          calledPattern = pattern;
          return true;
        },
      },
      configurable: true,
      writable: true,
    });

    assert.equal(isHapticsSupported(), true);
    assert.equal(hapticTick(), true);
    assert.equal(calledPattern, 20);

    assert.equal(hapticYourTurn(), true);
    assert.deepEqual(calledPattern, [35, 60, 45]);

    assert.equal(hapticEliminated(), true);
    assert.deepEqual(calledPattern, [120, 80, 160]);
  });

  it('prevents all vibrations when haptics toggle is disabled', () => {
    let callCount = 0;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: () => {
          callCount++;
          return true;
        },
      },
      configurable: true,
      writable: true,
    });

    setHapticsEnabled(false);
    assert.equal(isHapticsEnabled(), false);

    assert.equal(hapticTick(), false);
    assert.equal(hapticYourTurn(), false);
    assert.equal(hapticEliminated(), false);
    assert.equal(callCount, 0, 'navigator.vibrate must never be called when disabled');
  });
});
