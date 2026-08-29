/**
 * Homography & Perspective Transform Utilities
 * Computes exact projective mapping from unit square coordinates [0, 1]^2
 * to arbitrary 4-point convex quadrilateral corners in image space.
 */

import { Point2D } from '../types';

export interface HomographyMatrix {
  h00: number;
  h01: number;
  h02: number;
  h10: number;
  h11: number;
  h12: number;
  h20: number;
  h21: number;
}

/**
 * Calculates homography matrix mapping unit square (0,0), (1,0), (1,1), (0,1)
 * to arbitrary quadrilateral points [TL, TR, BR, BL]
 */
export function getSquareToQuadHomography(corners: [Point2D, Point2D, Point2D, Point2D]): HomographyMatrix {
  const [p0, p1, p2, p3] = corners; // TL, TR, BR, BL

  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sx = p0.x - p1.x + p2.x - p3.x;

  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sy = p0.y - p1.y + p2.y - p3.y;

  // Affine case
  if (Math.abs(sx) < 1e-7 && Math.abs(sy) < 1e-7) {
    return {
      h00: p1.x - p0.x,
      h01: p2.x - p1.x,
      h02: p0.x,
      h10: p1.y - p0.y,
      h11: p2.y - p1.y,
      h12: p0.y,
      h20: 0,
      h21: 0,
    };
  }

  // Projective case
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-7) {
    // Fallback if degenerate
    return {
      h00: p1.x - p0.x,
      h01: p3.x - p0.x,
      h02: p0.x,
      h10: p1.y - p0.y,
      h11: p3.y - p0.y,
      h12: p0.y,
      h20: 0,
      h21: 0,
    };
  }

  const h20 = (sx * dy2 - sy * dx2) / denom;
  const h21 = (dx1 * sy - dy1 * sx) / denom;
  const h00 = p1.x - p0.x + h20 * p1.x;
  const h01 = p3.x - p0.x + h21 * p3.x;
  const h02 = p0.x;
  const h10 = p1.y - p0.y + h20 * p1.y;
  const h11 = p3.y - p0.y + h21 * p3.y;
  const h12 = p0.y;

  return { h00, h01, h02, h10, h11, h12, h20, h21 };
}

/**
 * Transforms a point (u, v) in [0, 1] unit square to image coordinates using homography
 */
export function transformPoint(u: number, v: number, H: HomographyMatrix): Point2D {
  const w = H.h20 * u + H.h21 * v + 1.0;
  const safeW = Math.abs(w) < 1e-7 ? 1.0 : w;
  const x = (H.h00 * u + H.h01 * v + H.h02) / safeW;
  const y = (H.h10 * u + H.h11 * v + H.h12) / safeW;
  return { x, y };
}

/**
 * Returns sampling grid coordinates for a 4x4 face (16 points)
 * Row-major index: row 0..3, col 0..3
 */
export function getSamplingGridPoints(H: HomographyMatrix): Point2D[] {
  const points: Point2D[] = [];
  const gridSize = 4;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Center of each cell with slight margin away from sticker edges
      const u = (c + 0.5) / gridSize;
      const v = (r + 0.5) / gridSize;
      points.push(transformPoint(u, v, H));
    }
  }

  return points;
}
