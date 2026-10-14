import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSeatPositions } from './layout';

describe('Player Table Layout (getSeatPositions)', () => {
  it('returns empty array for non-positive player counts', () => {
    assert.deepEqual(getSeatPositions(0, 800, 600), []);
    assert.deepEqual(getSeatPositions(-1, 800, 600), []);
  });

  for (let n = 4; n <= 12; n++) {
    it(`correctly positions ${n} players with no overlaps and local player at bottom`, () => {
      const width = 800;
      const height = 600;
      const padding = 40;
      const localIndex = 0;

      const seats = getSeatPositions(n, width, height, localIndex, padding);
      assert.equal(seats.length, n);

      // 1. Verify bounds
      for (let i = 0; i < n; i++) {
        const seat = seats[i];
        assert.ok(seat.x >= padding - 1 && seat.x <= width - padding + 1, `Seat ${i} x (${seat.x}) is out of bounds`);
        assert.ok(seat.y >= padding - 1 && seat.y <= height - padding + 1, `Seat ${i} y (${seat.y}) is out of bounds`);
        assert.ok(seat.leftPercent >= 0 && seat.leftPercent <= 100);
        assert.ok(seat.topPercent >= 0 && seat.topPercent <= 100);
      }

      // 2. Verify local player is at the bottom (y is highest or near highest, x is near center)
      const localSeat = seats[localIndex];
      assert.ok(
        Math.abs(localSeat.x - width / 2) < 2,
        `Local player x (${localSeat.x}) should be at center (${width / 2})`
      );
      assert.ok(
        localSeat.y >= height - padding - 2,
        `Local player y (${localSeat.y}) should be at the bottom near (${height - padding})`
      );

      // 3. Verify no overlaps: minimum distance between any 2 seats
      // For an ellipse perimeter, adjacent seats should have meaningful separation
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dist = Math.hypot(seats[i].x - seats[j].x, seats[i].y - seats[j].y);
          assert.ok(
            dist > 30,
            `Seats ${i} and ${j} overlap or are too close for n=${n}: dist=${dist.toFixed(1)}px`
          );
        }
      }
    });

    it(`anchors different localIndex correctly for ${n} players`, () => {
      const width = 600;
      const height = 600;
      const targetLocalIndex = Math.floor(n / 2);
      const seats = getSeatPositions(n, width, height, targetLocalIndex, 30);

      const localSeat = seats[targetLocalIndex];
      assert.ok(
        Math.abs(localSeat.x - width / 2) < 2,
        `Selected local player ${targetLocalIndex} x (${localSeat.x}) should be at horizontal center`
      );
      assert.ok(
        localSeat.y >= height - 35,
        `Selected local player ${targetLocalIndex} y (${localSeat.y}) should be at bottom`
      );
    });
  }
});
