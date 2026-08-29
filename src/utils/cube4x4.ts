/**
 * 4x4x4 Rubik's Revenge Cube Model, Simulator and State Engine
 * Implements full 96-sticker permutation logic for all standard 4x4 WCA moves:
 * outer turns (U, D, F, B, L, R), wide turns (Uw, Dw, Fw, Bw, Lw, Rw),
 * inner slices (u, d, f, b, l, r), and cube rotations (x, y, z).
 */

import { CubeColor, CubeState, FaceName, FaceStickers, ValidationStatus } from '../types';
import { analyzeCube4x4State } from './cube4x4Diagnostics';

export const SOLVED_FACE_COLORS: Record<FaceName, CubeColor> = {
  U: 'W',
  D: 'Y',
  F: 'G',
  B: 'B',
  L: 'O',
  R: 'R',
};

/**
 * Creates a brand new, solved 4x4 cube state
 */
export function createSolvedCubeState(): CubeState {
  const state = {} as CubeState;
  const faces: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  
  for (const face of faces) {
    const color = SOLVED_FACE_COLORS[face];
    state[face] = Array.from({ length: 16 }, () => ({
      color,
      uncertain: false,
      confidence: 1.0,
    }));
  }
  
  return state;
}

/**
 * Clones a cube state deeply
 */
export function cloneCubeState(state: CubeState): CubeState {
  const clone = {} as CubeState;
  const faces: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  for (const face of faces) {
    clone[face] = state[face].map((st) => ({ ...st }));
  }
  return clone;
}

/**
 * Rotates a 4x4 face array 90 degrees clockwise
 */
function rotateFaceCW(face: FaceStickers): FaceStickers {
  const res = new Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      // New pos = (c, 3 - r) -> index = c * 4 + (3 - r)
      res[c * 4 + (3 - r)] = { ...face[r * 4 + c] };
    }
  }
  return res;
}

/**
 * Rotates a 4x4 face array 90 degrees counter-clockwise
 */
function rotateFaceCCW(face: FaceStickers): FaceStickers {
  const res = new Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      // New pos = (3 - c, r) -> index = (3 - c) * 4 + r
      res[(3 - c) * 4 + r] = { ...face[r * 4 + c] };
    }
  }
  return res;
}

/**
 * Rotates a 4x4 face array 180 degrees
 */
function rotateFace180(face: FaceStickers): FaceStickers {
  const res = new Array(16);
  for (let i = 0; i < 16; i++) {
    res[15 - i] = { ...face[i] };
  }
  return res;
}

/**
 * Applies a basic atomic turn to the cube state
 */
export function applyAtomicMove(state: CubeState, move: string): void {
  const m = move.trim();
  if (!m) return;

  switch (m) {
    // ----------------- U Face Moves -----------------
    case 'U': {
      state.U = rotateFaceCW(state.U);
      const temp = [state.F[0], state.F[1], state.F[2], state.F[3]];
      // F top -> L top -> B top -> R top -> F top
      state.F[0] = state.R[0]; state.F[1] = state.R[1]; state.F[2] = state.R[2]; state.F[3] = state.R[3];
      state.R[0] = state.B[0]; state.R[1] = state.B[1]; state.R[2] = state.B[2]; state.R[3] = state.B[3];
      state.B[0] = state.L[0]; state.B[1] = state.L[1]; state.B[2] = state.L[2]; state.B[3] = state.L[3];
      state.L[0] = temp[0]; state.L[1] = temp[1]; state.L[2] = temp[2]; state.L[3] = temp[3];
      break;
    }
    case "U'": {
      applyAtomicMove(state, 'U');
      applyAtomicMove(state, 'U');
      applyAtomicMove(state, 'U');
      break;
    }
    case 'U2': {
      applyAtomicMove(state, 'U');
      applyAtomicMove(state, 'U');
      break;
    }

    // u slice move (layer 1 from top)
    case 'u':
    case '2U': {
      const temp = [state.F[4], state.F[5], state.F[6], state.F[7]];
      state.F[4] = state.R[4]; state.F[5] = state.R[5]; state.F[6] = state.R[6]; state.F[7] = state.R[7];
      state.R[4] = state.B[4]; state.R[4+1] = state.B[4+1]; state.R[4+2] = state.B[4+2]; state.R[4+3] = state.B[4+3];
      state.B[4] = state.L[4]; state.B[4+1] = state.L[4+1]; state.B[4+2] = state.L[4+2]; state.B[4+3] = state.L[4+3];
      state.L[4] = temp[0]; state.L[5] = temp[1]; state.L[6] = temp[2]; state.L[7] = temp[3];
      break;
    }
    case "u'":
    case "2U'": {
      applyAtomicMove(state, 'u');
      applyAtomicMove(state, 'u');
      applyAtomicMove(state, 'u');
      break;
    }
    case 'u2':
    case '2U2': {
      applyAtomicMove(state, 'u');
      applyAtomicMove(state, 'u');
      break;
    }

    // Uw wide move (U + u)
    case 'Uw': {
      applyAtomicMove(state, 'U');
      applyAtomicMove(state, 'u');
      break;
    }
    case "Uw'": {
      applyAtomicMove(state, "U'");
      applyAtomicMove(state, "u'");
      break;
    }
    case 'Uw2': {
      applyAtomicMove(state, 'U2');
      applyAtomicMove(state, 'u2');
      break;
    }

    // ----------------- D Face Moves -----------------
    case 'D': {
      state.D = rotateFaceCW(state.D);
      const temp = [state.F[12], state.F[13], state.F[14], state.F[15]];
      // F bottom -> R bottom -> B bottom -> L bottom -> F bottom
      state.F[12] = state.L[12]; state.F[13] = state.L[13]; state.F[14] = state.L[14]; state.F[15] = state.L[15];
      state.L[12] = state.B[12]; state.L[13] = state.B[13]; state.L[14] = state.B[14]; state.L[15] = state.B[15];
      state.B[12] = state.R[12]; state.B[13] = state.R[13]; state.B[14] = state.R[14]; state.B[15] = state.R[15];
      state.R[12] = temp[0]; state.R[13] = temp[1]; state.R[14] = temp[2]; state.R[15] = temp[3];
      break;
    }
    case "D'": {
      applyAtomicMove(state, 'D');
      applyAtomicMove(state, 'D');
      applyAtomicMove(state, 'D');
      break;
    }
    case 'D2': {
      applyAtomicMove(state, 'D');
      applyAtomicMove(state, 'D');
      break;
    }

    // d slice move (layer 2 from bottom = layer index 2)
    case 'd':
    case '2D': {
      const temp = [state.F[8], state.F[9], state.F[10], state.F[11]];
      state.F[8] = state.L[8]; state.F[9] = state.L[9]; state.F[10] = state.L[10]; state.F[11] = state.L[11];
      state.L[8] = state.B[8]; state.L[9] = state.B[9]; state.L[10] = state.B[10]; state.L[11] = state.B[11];
      state.B[8] = state.R[8]; state.B[9] = state.R[9]; state.B[10] = state.R[10]; state.B[11] = state.R[11];
      state.R[8] = temp[0]; state.R[9] = temp[1]; state.R[10] = temp[2]; state.R[11] = temp[3];
      break;
    }
    case "d'":
    case "2D'": {
      applyAtomicMove(state, 'd');
      applyAtomicMove(state, 'd');
      applyAtomicMove(state, 'd');
      break;
    }
    case 'd2':
    case '2D2': {
      applyAtomicMove(state, 'd');
      applyAtomicMove(state, 'd');
      break;
    }

    // Dw wide move (D + d)
    case 'Dw': {
      applyAtomicMove(state, 'D');
      applyAtomicMove(state, 'd');
      break;
    }
    case "Dw'": {
      applyAtomicMove(state, "D'");
      applyAtomicMove(state, "d'");
      break;
    }
    case 'Dw2': {
      applyAtomicMove(state, 'D2');
      applyAtomicMove(state, 'd2');
      break;
    }

    // ----------------- R Face Moves -----------------
    case 'R': {
      state.R = rotateFaceCW(state.R);
      const temp = [state.U[3], state.U[7], state.U[11], state.U[15]];
      // U col 3 -> B col 0 (inverted) -> D col 3 -> F col 3 -> U col 3
      state.U[3] = state.F[3]; state.U[7] = state.F[7]; state.U[11] = state.F[11]; state.U[15] = state.F[15];
      state.F[3] = state.D[3]; state.F[7] = state.D[7]; state.F[11] = state.D[11]; state.F[15] = state.D[15];
      state.D[3] = state.B[12]; state.D[7] = state.B[8]; state.D[11] = state.B[4]; state.D[15] = state.B[0];
      state.B[12] = temp[0]; state.B[8] = temp[1]; state.B[4] = temp[2]; state.B[0] = temp[3];
      break;
    }
    case "R'": {
      applyAtomicMove(state, 'R');
      applyAtomicMove(state, 'R');
      applyAtomicMove(state, 'R');
      break;
    }
    case 'R2': {
      applyAtomicMove(state, 'R');
      applyAtomicMove(state, 'R');
      break;
    }

    // r slice move (layer 2 from right = col 2)
    case 'r':
    case '2R': {
      const temp = [state.U[2], state.U[6], state.U[10], state.U[14]];
      state.U[2] = state.F[2]; state.U[6] = state.F[6]; state.U[10] = state.F[10]; state.U[14] = state.F[14];
      state.F[2] = state.D[2]; state.F[6] = state.D[6]; state.F[10] = state.D[10]; state.F[14] = state.D[14];
      state.D[2] = state.B[13]; state.D[6] = state.B[9]; state.D[10] = state.B[5]; state.D[14] = state.B[1];
      state.B[13] = temp[0]; state.B[9] = temp[1]; state.B[5] = temp[2]; state.B[1] = temp[3];
      break;
    }
    case "r'":
    case "2R'": {
      applyAtomicMove(state, 'r');
      applyAtomicMove(state, 'r');
      applyAtomicMove(state, 'r');
      break;
    }
    case 'r2':
    case '2R2': {
      applyAtomicMove(state, 'r');
      applyAtomicMove(state, 'r');
      break;
    }

    // Rw wide move (R + r)
    case 'Rw': {
      applyAtomicMove(state, 'R');
      applyAtomicMove(state, 'r');
      break;
    }
    case "Rw'": {
      applyAtomicMove(state, "R'");
      applyAtomicMove(state, "r'");
      break;
    }
    case 'Rw2': {
      applyAtomicMove(state, 'R2');
      applyAtomicMove(state, 'r2');
      break;
    }

    // ----------------- L Face Moves -----------------
    case 'L': {
      state.L = rotateFaceCW(state.L);
      const temp = [state.U[0], state.U[4], state.U[8], state.U[12]];
      // U col 0 -> B col 3 (inv) -> D col 0 -> F col 0 -> U col 0
      state.U[0] = state.B[15]; state.U[4] = state.B[11]; state.U[8] = state.B[7]; state.U[12] = state.B[3];
      state.B[15] = state.D[0]; state.B[11] = state.D[4]; state.B[7] = state.D[8]; state.B[3] = state.D[12];
      state.D[0] = state.F[0]; state.D[4] = state.F[4]; state.D[8] = state.F[8]; state.D[12] = state.F[12];
      state.F[0] = temp[0]; state.F[4] = temp[1]; state.F[8] = temp[2]; state.F[12] = temp[3];
      break;
    }
    case "L'": {
      applyAtomicMove(state, 'L');
      applyAtomicMove(state, 'L');
      applyAtomicMove(state, 'L');
      break;
    }
    case 'L2': {
      applyAtomicMove(state, 'L');
      applyAtomicMove(state, 'L');
      break;
    }

    // l slice move (layer 2 from left = col 1)
    case 'l':
    case '2L': {
      const temp = [state.U[1], state.U[5], state.U[9], state.U[13]];
      state.U[1] = state.B[14]; state.U[5] = state.B[10]; state.U[9] = state.B[6]; state.U[13] = state.B[2];
      state.B[14] = state.D[1]; state.B[10] = state.D[5]; state.B[6] = state.D[9]; state.B[2] = state.D[13];
      state.D[1] = state.F[1]; state.D[5] = state.F[5]; state.D[9] = state.F[9]; state.D[13] = state.F[13];
      state.F[1] = temp[0]; state.F[5] = temp[1]; state.F[9] = temp[2]; state.F[13] = temp[3];
      break;
    }
    case "l'":
    case "2L'": {
      applyAtomicMove(state, 'l');
      applyAtomicMove(state, 'l');
      applyAtomicMove(state, 'l');
      break;
    }
    case 'l2':
    case '2L2': {
      applyAtomicMove(state, 'l');
      applyAtomicMove(state, 'l');
      break;
    }

    // Lw wide move (L + l)
    case 'Lw': {
      applyAtomicMove(state, 'L');
      applyAtomicMove(state, 'l');
      break;
    }
    case "Lw'": {
      applyAtomicMove(state, "L'");
      applyAtomicMove(state, "l'");
      break;
    }
    case 'Lw2': {
      applyAtomicMove(state, 'L2');
      applyAtomicMove(state, 'l2');
      break;
    }

    // ----------------- F Face Moves -----------------
    case 'F': {
      state.F = rotateFaceCW(state.F);
      const temp = [state.U[12], state.U[13], state.U[14], state.U[15]];
      // U row 3 -> R col 0 -> D row 0 (inv) -> L col 3 (inv) -> U row 3
      state.U[12] = state.L[15]; state.U[13] = state.L[11]; state.U[14] = state.L[7]; state.U[15] = state.L[3];
      state.L[3] = state.D[0]; state.L[7] = state.D[1]; state.L[11] = state.D[2]; state.L[15] = state.D[3];
      state.D[0] = state.R[12]; state.D[1] = state.R[8]; state.D[2] = state.R[4]; state.D[3] = state.R[0];
      state.R[0] = temp[0]; state.R[4] = temp[1]; state.R[8] = temp[2]; state.R[12] = temp[3];
      break;
    }
    case "F'": {
      applyAtomicMove(state, 'F');
      applyAtomicMove(state, 'F');
      applyAtomicMove(state, 'F');
      break;
    }
    case 'F2': {
      applyAtomicMove(state, 'F');
      applyAtomicMove(state, 'F');
      break;
    }

    // f slice move (layer 2 from front = row 2 of top/bottom, etc.)
    case 'f':
    case '2F': {
      const temp = [state.U[8], state.U[9], state.U[10], state.U[11]];
      state.U[8] = state.L[14]; state.U[9] = state.L[10]; state.U[10] = state.L[6]; state.U[11] = state.L[2];
      state.L[2] = state.D[4]; state.L[6] = state.D[5]; state.L[10] = state.D[6]; state.L[14] = state.D[7];
      state.D[4] = state.R[13]; state.D[5] = state.R[9]; state.D[6] = state.R[5]; state.D[7] = state.R[1];
      state.R[1] = temp[0]; state.R[5] = temp[1]; state.R[9] = temp[2]; state.R[13] = temp[3];
      break;
    }
    case "f'":
    case "2F'": {
      applyAtomicMove(state, 'f');
      applyAtomicMove(state, 'f');
      applyAtomicMove(state, 'f');
      break;
    }
    case 'f2':
    case '2F2': {
      applyAtomicMove(state, 'f');
      applyAtomicMove(state, 'f');
      break;
    }

    // Fw wide move (F + f)
    case 'Fw': {
      applyAtomicMove(state, 'F');
      applyAtomicMove(state, 'f');
      break;
    }
    case "Fw'": {
      applyAtomicMove(state, "F'");
      applyAtomicMove(state, "f'");
      break;
    }
    case 'Fw2': {
      applyAtomicMove(state, 'F2');
      applyAtomicMove(state, 'f2');
      break;
    }

    // ----------------- B Face Moves -----------------
    case 'B': {
      state.B = rotateFaceCW(state.B);
      const temp = [state.U[0], state.U[1], state.U[2], state.U[3]];
      // U row 0 -> R col 3 (inv) -> D row 3 -> L col 0 (inv) -> U row 0
      state.U[0] = state.R[3]; state.U[1] = state.R[7]; state.U[2] = state.R[11]; state.U[3] = state.R[15];
      state.R[3] = state.D[15]; state.R[7] = state.D[14]; state.R[11] = state.D[13]; state.R[15] = state.D[12];
      state.D[12] = state.L[0]; state.D[13] = state.L[4]; state.D[14] = state.L[8]; state.D[15] = state.L[12];
      state.L[0] = temp[3]; state.L[4] = temp[2]; state.L[8] = temp[1]; state.L[12] = temp[0];
      break;
    }
    case "B'": {
      applyAtomicMove(state, 'B');
      applyAtomicMove(state, 'B');
      applyAtomicMove(state, 'B');
      break;
    }
    case 'B2': {
      applyAtomicMove(state, 'B');
      applyAtomicMove(state, 'B');
      break;
    }

    // b slice move (layer 2 from back)
    case 'b':
    case '2B': {
      const temp = [state.U[4], state.U[5], state.U[6], state.U[7]];
      state.U[4] = state.R[2]; state.U[5] = state.R[6]; state.U[6] = state.R[10]; state.U[7] = state.R[14];
      state.R[2] = state.D[11]; state.R[6] = state.D[10]; state.R[10] = state.D[9]; state.R[14] = state.D[8];
      state.D[8] = state.L[1]; state.D[9] = state.L[5]; state.D[10] = state.L[9]; state.D[11] = state.L[13];
      state.L[1] = temp[3]; state.L[5] = temp[2]; state.L[9] = temp[1]; state.L[13] = temp[0];
      break;
    }
    case "b'":
    case "2B'": {
      applyAtomicMove(state, 'b');
      applyAtomicMove(state, 'b');
      applyAtomicMove(state, 'b');
      break;
    }
    case 'b2':
    case '2B2': {
      applyAtomicMove(state, 'b');
      applyAtomicMove(state, 'b');
      break;
    }

    // Bw wide move (B + b)
    case 'Bw': {
      applyAtomicMove(state, 'B');
      applyAtomicMove(state, 'b');
      break;
    }
    case "Bw'": {
      applyAtomicMove(state, "B'");
      applyAtomicMove(state, "b'");
      break;
    }
    case 'Bw2': {
      applyAtomicMove(state, 'B2');
      applyAtomicMove(state, 'b2');
      break;
    }

    // ----------------- Whole Cube Rotations -----------------
    case 'x': {
      // Rotate whole cube around R axis (like R, Rw, Lw', L')
      const oldU = [...state.U];
      const oldF = [...state.F];
      const oldD = [...state.D];
      const oldB = [...state.B];
      state.R = rotateFaceCW(state.R);
      state.L = rotateFaceCCW(state.L);
      state.U = oldF;
      state.F = oldD;
      state.D = rotateFace180(oldB);
      state.B = rotateFace180(oldU);
      break;
    }
    case "x'": {
      applyAtomicMove(state, 'x');
      applyAtomicMove(state, 'x');
      applyAtomicMove(state, 'x');
      break;
    }
    case 'x2': {
      applyAtomicMove(state, 'x');
      applyAtomicMove(state, 'x');
      break;
    }

    case 'y': {
      // Rotate whole cube around U axis (like U, u, d', D')
      const oldF = [...state.F];
      const oldL = [...state.L];
      const oldB = [...state.B];
      const oldR = [...state.R];
      state.U = rotateFaceCW(state.U);
      state.D = rotateFaceCCW(state.D);
      state.F = oldR;
      state.R = oldB;
      state.B = oldL;
      state.L = oldF;
      break;
    }
    case "y'": {
      applyAtomicMove(state, 'y');
      applyAtomicMove(state, 'y');
      applyAtomicMove(state, 'y');
      break;
    }
    case 'y2': {
      applyAtomicMove(state, 'y');
      applyAtomicMove(state, 'y');
      break;
    }

    case 'z': {
      // Rotate whole cube around F axis
      applyAtomicMove(state, 'x');
      applyAtomicMove(state, 'y');
      applyAtomicMove(state, "x'");
      break;
    }
    case "z'": {
      applyAtomicMove(state, 'z');
      applyAtomicMove(state, 'z');
      applyAtomicMove(state, 'z');
      break;
    }
    case 'z2': {
      applyAtomicMove(state, 'z');
      applyAtomicMove(state, 'z');
      break;
    }

    default:
      console.warn(`Unrecognized move: ${move}`);
  }
}

/**
 * Applies a space-separated sequence of moves to the cube state
 */
export function applyMoveSequence(state: CubeState, movesStr: string | string[]): void {
  const moves = Array.isArray(movesStr) ? movesStr : movesStr.trim().split(/\s+/).filter(Boolean);
  for (const move of moves) {
    applyAtomicMove(state, move);
  }
}

/**
 * Checks if all stickers on each face are of the same uniform color
 */
export function isCubeSolved(state: CubeState): boolean {
  const faces: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  for (const face of faces) {
    const firstColor = state[face][0].color;
    for (let i = 1; i < 16; i++) {
      if (state[face][i].color !== firstColor) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Validates the full 96-sticker cube state:
 * - Exactly 16 stickers of each of the 6 colors
 * - No uncertain stickers remaining
 */
export function validateCubeState(state: CubeState): ValidationStatus {
  const counts: Record<CubeColor, number> = { W: 0, Y: 0, R: 0, O: 0, B: 0, G: 0 };
  const faceUncertain: Record<FaceName, number> = { U: 0, D: 0, F: 0, B: 0, L: 0, R: 0 };
  let totalUncertain = 0;
  const errors: string[] = [];

  const faces: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  for (const face of faces) {
    for (let i = 0; i < 16; i++) {
      const st = state[face][i];
      if (st.color && counts[st.color] !== undefined) {
        counts[st.color]++;
      }
      if (st.uncertain) {
        faceUncertain[face]++;
        totalUncertain++;
      }
    }
  }

  // Check uncertain
  if (totalUncertain > 0) {
    errors.push(`${totalUncertain} sticker${totalUncertain === 1 ? '' : 's'} flagged as uncertain. Tap to confirm/correct.`);
  }

  // Check face total uncertain (failed capture)
  for (const face of faces) {
    if (faceUncertain[face] === 16) {
      errors.push(`Face ${face} appears to have failed capture (16 uncertain stickers).`);
    }
  }

  // Check counts
  const colors: CubeColor[] = ['W', 'Y', 'R', 'O', 'B', 'G'];
  let countsValid = true;
  for (const c of colors) {
    if (counts[c] !== 16) {
      countsValid = false;
      errors.push(`Color ${c} count is ${counts[c]}/16 (needs exactly 16).`);
    }
  }

  // Mathematical & Physical Diagnostics (Corner pieces, wing edge distributions, parities)
  const diagnostics = analyzeCube4x4State(state);
  if (!diagnostics.isMathematicallyValid) {
    for (const err of diagnostics.errors) {
      if (!errors.includes(err) && !err.startsWith('Sticker Count Mismatch')) {
        errors.push(err);
      }
    }
  }

  return {
    isValid: errors.length === 0 && countsValid && totalUncertain === 0 && diagnostics.isMathematicallyValid,
    colorCounts: counts,
    uncertainCount: totalUncertain,
    faceUncertainCounts: faceUncertain,
    errors,
  };
}

/**
 * Creates a standard demo scramble for testing
 */
export function createDemoScramble(): { state: CubeState; scrambleMoves: string } {
  const state = createSolvedCubeState();
  const scrambleMoves = "Rw U2 Fw2 Lw' D2 Bw2 R U' F2 Rw' Uw2 B2 L' Fw U2 Rw2 Bw' D' R2 Uw";
  applyMoveSequence(state, scrambleMoves);
  return { state, scrambleMoves };
}
