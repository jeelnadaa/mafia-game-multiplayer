export interface SeatPosition {
  x: number;
  y: number;
  leftPercent: number;
  topPercent: number;
  angleRad: number;
}

/**
 * Calculates seat positions for n players around an elliptical table.
 * 
 * Rules:
 * - Local player (or index 0 by default) is anchored at the bottom (6 o'clock).
 * - Seats are distributed evenly around the ellipse.
 * - All positions remain strictly within the bounds [0, width] x [0, height].
 * - Pure function, zero side-effects, unit-tested for n = 4..12.
 */
export function getSeatPositions(
  n: number,
  width: number,
  height: number,
  localIndex: number = 0,
  padding: number = 36
): SeatPosition[] {
  if (n <= 0) return [];

  const effectiveWidth = Math.max(100, width);
  const effectiveHeight = Math.max(100, height);

  const centerX = effectiveWidth / 2;
  const centerY = effectiveHeight / 2;

  // Radii of ellipse leaving safe padding for avatar + labels
  const radiusX = Math.max(20, (effectiveWidth / 2) - padding);
  const radiusY = Math.max(20, (effectiveHeight / 2) - padding);

  const positions: SeatPosition[] = [];

  for (let i = 0; i < n; i++) {
    // Relative offset from local player so local player is always at index offset 0 (bottom)
    const relIndex = (i - localIndex + n) % n;
    
    // Bottom is angle = Math.PI / 2 in standard Cartesian where Y points down (screen coordinates)
    // Clockwise traversal: Math.PI / 2 + (2 * Math.PI * relIndex) / n
    const angleRad = Math.PI / 2 + (2 * Math.PI * relIndex) / n;

    const x = centerX + radiusX * Math.cos(angleRad);
    const y = centerY + radiusY * Math.sin(angleRad);

    const leftPercent = Math.min(100, Math.max(0, (x / effectiveWidth) * 100));
    const topPercent = Math.min(100, Math.max(0, (y / effectiveHeight) * 100));

    positions.push({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      leftPercent: Math.round(leftPercent * 100) / 100,
      topPercent: Math.round(topPercent * 100) / 100,
      angleRad,
    });
  }

  return positions;
}
