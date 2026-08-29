/**
 * Types and definitions for 4x4 Rubik's Cube Scanner & Solver
 */

export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

export type CubeColor = 'W' | 'Y' | 'R' | 'O' | 'B' | 'G';

export interface ColorDef {
  code: CubeColor;
  name: string;
  hex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  expectedHue: number; // 0 - 360
}

export const CUBE_COLORS: Record<CubeColor, ColorDef> = {
  W: { code: 'W', name: 'White', hex: '#ffffff', bgClass: 'bg-white text-slate-900', borderClass: 'border-slate-300', textClass: 'text-slate-900', expectedHue: 0 },
  Y: { code: 'Y', name: 'Yellow', hex: '#facc15', bgClass: 'bg-yellow-400 text-slate-900', borderClass: 'border-yellow-500', textClass: 'text-yellow-600', expectedHue: 55 },
  R: { code: 'R', name: 'Red', hex: '#ef4444', bgClass: 'bg-red-500 text-white', borderClass: 'border-red-600', textClass: 'text-red-500', expectedHue: 0 },
  O: { code: 'O', name: 'Orange', hex: '#f97316', bgClass: 'bg-orange-500 text-white', borderClass: 'border-orange-600', textClass: 'text-orange-500', expectedHue: 25 },
  B: { code: 'B', name: 'Blue', hex: '#3b82f6', bgClass: 'bg-blue-500 text-white', borderClass: 'border-blue-600', textClass: 'text-blue-500', expectedHue: 215 },
  G: { code: 'G', name: 'Green', hex: '#22c55e', bgClass: 'bg-green-500 text-white', borderClass: 'border-green-600', textClass: 'text-green-500', expectedHue: 130 },
};

export const COLOR_CYCLE: CubeColor[] = ['W', 'Y', 'R', 'O', 'B', 'G'];

export const FACE_NAMES: FaceName[] = ['U', 'L', 'F', 'R', 'B', 'D'];

export const FACE_METADATA: Record<FaceName, { label: string; defaultColor: CubeColor; description: string; holdInstruction: string; topFaceRef: string }> = {
  F: { 
    label: 'Front Face', 
    defaultColor: 'G', 
    description: 'Green Face (Standard Front)', 
    holdInstruction: 'Hold Front (Green) directly facing you, with Top (White) on top.', 
    topFaceRef: 'Top = White (U)' 
  },
  R: { 
    label: 'Right Face', 
    defaultColor: 'R', 
    description: 'Red Face (Standard Right)', 
    holdInstruction: 'Rotate cube 90° to the left so Right (Red) is facing you, with Top (White) on top.', 
    topFaceRef: 'Top = White (U)' 
  },
  B: { 
    label: 'Back Face', 
    defaultColor: 'B', 
    description: 'Blue Face (Standard Back)', 
    holdInstruction: 'Rotate cube another 90° so Back (Blue) is facing you, with Top (White) on top.', 
    topFaceRef: 'Top = White (U)' 
  },
  L: { 
    label: 'Left Face', 
    defaultColor: 'O', 
    description: 'Orange Face (Standard Left)', 
    holdInstruction: 'Rotate cube so Left (Orange) is facing you, with Top (White) on top.', 
    topFaceRef: 'Top = White (U)' 
  },
  U: { 
    label: 'Up (Top) Face', 
    defaultColor: 'W', 
    description: 'White Face (Standard Top)', 
    holdInstruction: 'Tilt cube up towards you so Up (White) is facing you, with Back (Blue) at the top.', 
    topFaceRef: 'Top Edge = Back (Blue)' 
  },
  D: { 
    label: 'Down (Bottom) Face', 
    defaultColor: 'Y', 
    description: 'Yellow Face (Standard Bottom)', 
    holdInstruction: 'Tilt cube down towards you so Down (Yellow) is facing you, with Front (Green) at the top.', 
    topFaceRef: 'Top Edge = Front (Green)' 
  },
};

export interface Point2D {
  x: number;
  y: number;
}

export interface StickerState {
  color: CubeColor;
  uncertain: boolean;
  confidence: number;
  rawRgb?: [number, number, number];
}

export type FaceStickers = StickerState[]; // 16 items for a 4x4 face

export type CubeState = Record<FaceName, FaceStickers>;

export interface CapturedFaceData {
  imageSrc: string | null;
  corners: [Point2D, Point2D, Point2D, Point2D]; // TL, TR, BR, BL normalized [0, 1]
  hasProcessed: boolean;
}

export type CapturedFaces = Record<FaceName, CapturedFaceData>;

export type SolvePhase = 'centers' | 'edges' | '3x3-cross' | '3x3-f2l' | '3x3-oll' | '3x3-pll' | 'oll-parity' | 'pll-parity';

export interface MoveStep {
  stepNumber: number;
  move: string;
  notationExplained: string;
  phase: SolvePhase;
  phaseTitle: string;
  stageProgress: { current: number; total: number };
}

export interface SolveResult {
  success: boolean;
  moves: MoveStep[];
  moveNotationList: string[];
  totalMoves: number;
  simulatedVerificationPassed: boolean;
  errorMessage?: string;
  phaseSummary: {
    centersCount: number;
    edgesCount: number;
    threeByThreeCount: number;
    parityCount: number;
  };
  diagnostics?: any; // CubeDiagnosticReport
}

export interface ValidationStatus {
  isValid: boolean;
  colorCounts: Record<CubeColor, number>;
  uncertainCount: number;
  faceUncertainCounts: Record<FaceName, number>;
  errors: string[];
}
