/**
 * 4x4 Rubik's Cube Scanner & Solver
 * Master Application Component
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Camera,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Box,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  ArrowDown,
  Loader2,
  Activity,
  Wrench,
} from 'lucide-react';
import {
  FaceName,
  CubeColor,
  CubeState,
  CapturedFaces,
  StickerState,
  Point2D,
  SolveResult,
  FACE_NAMES,
  COLOR_CYCLE,
} from './types';
import {
  createSolvedCubeState,
  cloneCubeState,
  validateCubeState,
  createDemoScramble,
  applyAtomicMove,
} from './utils/cube4x4';
import { solve4x4Cube } from './utils/solver4x4';
import { analyzeCube4x4State, autoRepair4x4State } from './utils/cube4x4Diagnostics';
import { PerspectiveCropper } from './components/PerspectiveCropper';
import { CubeNet } from './components/CubeNet';
import { Cube3DView } from './components/Cube3DView';
import { SolvePlayer } from './components/SolvePlayer';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { LiveCameraModal } from './components/LiveCameraModal';
import { Cube3DScanModal } from './components/Cube3DScanModal';
import { optimizeImageFile } from './utils/imageOptimizer';

const STORAGE_KEY_STATE = 'rubiks_4x4_cube_state_v2';
const STORAGE_KEY_FACES = 'rubiks_4x4_captured_faces_v2';

export default function App() {
  // 1. Cube State (96 stickers across 6 faces) with localStorage persistence
  const [cubeState, setCubeState] = useState<CubeState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.U && parsed.D && parsed.F && parsed.B && parsed.L && parsed.R) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Storage read fallback:', e);
    }
    const { state } = createDemoScramble();
    return state;
  });

  // Base snapshot when solve begins to replay steps
  const [initialScrambleForSolve, setInitialScrambleForSolve] = useState<CubeState | null>(null);

  // 2. Photo Captures metadata for 6 faces with localStorage persistence
  const [capturedFaces, setCapturedFaces] = useState<CapturedFaces>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FACES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.U && parsed.D && parsed.F && parsed.B && parsed.L && parsed.R) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Storage read fallback:', e);
    }
    return {
      U: { imageSrc: null, corners: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }], hasProcessed: false },
      D: { imageSrc: null, corners: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }], hasProcessed: false },
      F: { imageSrc: null, corners: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }], hasProcessed: false },
      B: { imageSrc: null, corners: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }], hasProcessed: false },
      L: { imageSrc: null, corners: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }], hasProcessed: false },
      R: { imageSrc: null, corners: [{ x: 0.15, y: 0.15 }, { x: 0.85, y: 0.15 }, { x: 0.85, y: 0.85 }, { x: 0.15, y: 0.85 }], hasProcessed: false },
    };
  });

  // Active face currently in perspective cropper modal or live camera
  const [croppingFace, setCroppingFace] = useState<FaceName | null>(null);
  const [liveCameraFace, setLiveCameraFace] = useState<FaceName | null>(null);
  const [is3DScanOpen, setIs3DScanOpen] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);

  // 3. Solve Result and Step-by-step state
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Auto persist state to prevent loss on inadvertent refresh
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(cubeState));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }, [cubeState]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FACES, JSON.stringify(capturedFaces));
    } catch (e) {
      console.warn('Failed to save faces:', e);
    }
  }, [capturedFaces]);

  // Validation checksum
  const validation = useMemo(() => validateCubeState(cubeState), [cubeState]);

  // Real-time mathematical 4x4 state & parity diagnostics
  const liveDiagnostics = useMemo(() => analyzeCube4x4State(cubeState), [cubeState]);

  // Handle manual sticker click in 2D Net
  const handleStickerClick = (face: FaceName, index: number, targetColor?: CubeColor) => {
    setCubeState((prev) => {
      const next = cloneCubeState(prev);
      const currentSticker = next[face][index];

      if (targetColor) {
        currentSticker.color = targetColor;
      } else {
        // Cycle to next color
        const currentIndex = COLOR_CYCLE.indexOf(currentSticker.color);
        const nextIndex = (currentIndex + 1) % COLOR_CYCLE.length;
        currentSticker.color = COLOR_CYCLE[nextIndex];
      }
      currentSticker.uncertain = false; // clear uncertainty flag on manual edit
      currentSticker.confidence = 1.0;
      return next;
    });
    // Invalidate stale solve
    setSolveResult(null);
  };

  // Process and optimize image file to prevent high-res camera memory reload
  const handleFacePhotoUpload = async (face: FaceName, file: File) => {
    setIsProcessingImage(true);
    try {
      const optimizedDataUrl = await optimizeImageFile(file, 1280);
      setCapturedFaces((prev) => ({
        ...prev,
        [face]: {
          ...prev[face],
          imageSrc: optimizedDataUrl,
        },
      }));
      // Open perspective cropper immediately for user alignment
      setCroppingFace(face);
    } catch (err) {
      console.error('Error optimizing photo:', err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Handle snapshot from in-app WebRTC live camera
  const handleLiveCameraCapture = (dataUrl: string) => {
    if (!liveCameraFace) return;
    const face = liveCameraFace;
    setLiveCameraFace(null);

    setCapturedFaces((prev) => ({
      ...prev,
      [face]: {
        ...prev[face],
        imageSrc: dataUrl,
      },
    }));

    // Immediately open perspective cropper
    setCroppingFace(face);
  };

  // Confirm perspective crop and sampled stickers for a face
  const handleConfirmPerspectiveCrop = (
    corners: [Point2D, Point2D, Point2D, Point2D],
    sampledStickers: StickerState[]
  ) => {
    if (!croppingFace) return;
    const face = croppingFace;

    setCapturedFaces((prev) => ({
      ...prev,
      [face]: {
        ...prev[face],
        corners,
        hasProcessed: true,
      },
    }));

    // Update cubeState for this face
    setCubeState((prev) => {
      const next = cloneCubeState(prev);
      next[face] = sampledStickers.map((s) => ({ ...s }));
      return next;
    });

    setCroppingFace(null);
    setSolveResult(null);
  };

  // Complete continuous 3D Video & AI Cube Scan
  const handleComplete3DScan = (scannedState: CubeState, capturedPhotos: Record<FaceName, string>) => {
    setCubeState(scannedState);
    setCapturedFaces((prev) => {
      const next = { ...prev };
      (Object.keys(capturedPhotos) as FaceName[]).forEach((f) => {
        if (capturedPhotos[f]) {
          next[f] = {
            ...next[f],
            imageSrc: capturedPhotos[f],
            hasProcessed: true,
          };
        }
      });
      return next;
    });
    setIs3DScanOpen(false);
    setSolveResult(null);
  };

  // Load demo scramble
  const handleLoadDemoScramble = () => {
    const { state } = createDemoScramble();
    setCubeState(state);
    setSolveResult(null);
  };

  // Reset to solved state
  const handleResetSolved = () => {
    const state = createSolvedCubeState();
    setCubeState(state);
    setSolveResult(null);
  };

  // 1-Click Smart Auto-Repair Scanned Colors & Solve
  const handleAutoRepair = () => {
    setIsSolving(true);
    setTimeout(() => {
      const repair = autoRepair4x4State(cubeState);
      setCubeState(repair.repairedState);

      const result = solve4x4Cube(repair.repairedState);
      setSolveResult(result);
      setInitialScrambleForSolve(cloneCubeState(repair.repairedState));
      setCurrentStepIndex(0);
      setIsSolving(false);

      if (result.success) {
        setShowDiagnostics(false);
        setTimeout(() => {
          const el = document.getElementById('solve-player-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setShowDiagnostics(true);
      }
    }, 200);
  };

  // Generate verified step-by-step solve
  const handleGenerateSolve = () => {
    if (!validation.isValid) return;
    setIsSolving(true);

    setTimeout(() => {
      // Clone state to save for replaying
      const initialClone = cloneCubeState(cubeState);
      setInitialScrambleForSolve(initialClone);

      const result = solve4x4Cube(cubeState);
      setSolveResult(result);
      setCurrentStepIndex(0);
      setIsSolving(false);

      // If solve failed, scroll to the error notification card so the user can easily click Auto-Repair
      if (result.success) {
        const element = document.getElementById('solve-player-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        const element = document.getElementById('solve-error-notice');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 150);
  };

  // Step change in solve player (updates the 3D cube model to match the step)
  const handleStepChange = (targetIndex: number) => {
    if (!solveResult || !initialScrambleForSolve) return;
    const boundedIndex = Math.max(0, Math.min(targetIndex, solveResult.totalMoves));
    setCurrentStepIndex(boundedIndex);

    // Replay moves from initial state to targetIndex
    const state = cloneCubeState(initialScrambleForSolve);
    for (let i = 0; i < boundedIndex; i++) {
      applyAtomicMove(state, solveResult.moves[i].move);
    }
    setCubeState(state);
  };

  const handleResetToStartOfSolve = () => {
    handleStepChange(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Box className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                4x4 Rubik's Revenge
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Scanner &amp; Solver
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Perspective Homography • HSV Detection • Verified Reduction Solver
              </p>
            </div>
          </div>

          {/* Header Action buttons */}
          <div className="flex items-center gap-2">
            <button
              id="top-3d-ai-scan-btn"
              onClick={() => setIs3DScanOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
            >
              <Camera className="w-4 h-4 text-cyan-200" />
              <span>3D Video &amp; AI Scan</span>
            </button>

            <button
              id="top-solve-cta-btn"
              onClick={handleGenerateSolve}
              disabled={!validation.isValid || isSolving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all ${
                validation.isValid && !isSolving
                  ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSolving ? 'Solving...' : 'Solve 4x4 Cube'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
        {/* Flow Steps Breadcrumb */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between overflow-x-auto text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              1
            </span>
            <span className="text-slate-200 font-semibold">Snap / Load 6 Faces</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mx-1" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <span>Align Homography &amp; HSV Sample</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mx-1" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span>Confirm 16/16 Checksum</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mx-1" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              4
            </span>
            <span className="text-emerald-400 font-semibold">Step-by-Step Solve</span>
          </div>
        </div>

        {/* Interactive 3D Cube Viewer Section (At the top of mobile/page without sticky trapping) */}
        <section id="cube-3d-section" className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-400" />
              Interactive 3D 4x4 Rubik's Revenge
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                validation.isValid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {validation.isValid ? '96/96 Balanced' : 'Awaiting Balance'}
              </span>
            </div>
          </div>

          <Cube3DView cubeState={cubeState} compact={true} />

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Updates in real-time as you scan or edit faces. Drag to rotate, or scroll comfortably past this card to edit stickers and compute your step-by-step solve.
            </p>
          </div>
        </section>

        {/* 2D Net Editor, Validation & Camera slots accessible directly below */}
        <section id="cube-net-section" className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Camera className="w-4.5 h-4.5 text-blue-400" />
                Face Capture &amp; Sticker Net Editor
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click the camera icon on each face to upload or snap a photo, or click any sticker to cycle / paint colors.
              </p>
            </div>
          </div>

          {/* Cube Net Component */}
          <CubeNet
            cubeState={cubeState}
            validation={validation}
            onStickerClick={handleStickerClick}
            onFacePhotoUpload={handleFacePhotoUpload}
            onOpenPerspectiveCropper={(face) => setCroppingFace(face)}
            onOpenLiveCamera={(face) => setLiveCameraFace(face)}
            onOpen3DScanModal={() => setIs3DScanOpen(true)}
            hasPhotoForFace={(face) => Boolean(capturedFaces[face]?.imageSrc)}
            onLoadDemoScramble={handleLoadDemoScramble}
            onResetSolved={handleResetSolved}
            onAutoRepair={handleAutoRepair}
          />

          {/* 4x4 State Diagnostics & Parity Verifier Panel */}
          <DiagnosticPanel
            report={solveResult?.diagnostics || liveDiagnostics}
            isOpen={showDiagnostics}
            onToggle={() => setShowDiagnostics((prev) => !prev)}
            onAutoRepair={handleAutoRepair}
          />

          {/* Solve Error Notice if solver encountered an impossibility */}
          {solveResult && !solveResult.success && (
            <div
              id="solve-error-notice"
              className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100 scroll-mt-24"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 shrink-0 mt-0.5">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Scanned Colors Need a Quick Adjustment
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Camera glare or shadows usually cause 1 or 2 stickers to be misidentified. Click <strong>Auto-Repair Colors</strong> below and we will automatically fix any slight scanning errors into the closest physically legal cube and compute your step-by-step solve!
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleAutoRepair}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xl shadow-emerald-950 flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  ⚡ Auto-Repair Scanned Colors &amp; Solve
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiagnostics(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl transition border border-slate-700 flex items-center gap-2"
                >
                  <Activity className="w-4 h-4 text-blue-400" />
                  View Easy Fix Guide
                </button>

                <button
                  type="button"
                  onClick={handleLoadDemoScramble}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm rounded-xl transition border border-slate-700"
                >
                  Load Demo Scramble
                </button>
              </div>
            </div>
          )}

          {/* Solve Action Card */}
          <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-900/40 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <span className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Ready to Compute Solution?
              </span>
              <span className="text-xs text-slate-400">
                {validation.isValid
                  ? 'All 96 stickers verified. Runs reduction method with simulation self-check.'
                  : 'Lighting artifacts detected. Click ⚡ Auto-Repair & Solve to immediately fix and compute steps.'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {!validation.isValid ? (
                <button
                  id="auto-repair-solve-btn"
                  onClick={handleAutoRepair}
                  disabled={isSolving}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm tracking-wide shadow-xl transition-all w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-950 hover:scale-105"
                >
                  <Wrench className="w-4 h-4" />
                  {isSolving ? 'Auto-Repairing & Solving...' : '⚡ Auto-Repair & Solve'}
                </button>
              ) : (
                <button
                  id="main-solve-btn"
                  onClick={handleGenerateSolve}
                  disabled={isSolving}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm tracking-wide shadow-xl transition-all w-full sm:w-auto bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-500/30 hover:scale-105"
                >
                  {isSolving ? (
                    <>Computing Reduction Solve...</>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" /> Compute Solution
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Step-by-Step Solve Player Section (Visible when solved) */}
        {solveResult && (
          <div id="solve-player-section" className="pt-4 scroll-mt-20">
            <SolvePlayer
              solveResult={solveResult}
              currentStepIndex={currentStepIndex}
              onStepChange={handleStepChange}
              onResetToStart={handleResetToStartOfSolve}
              onAutoRepair={handleAutoRepair}
            />
          </div>
        )}
      </main>

      {/* Loading overlay during image downsampling / optimization */}
      {isProcessingImage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm font-bold text-slate-200">Optimizing camera photo...</span>
        </div>
      )}

      {/* Hidden file input for device photo upload fallback */}
      <input
        id="global-file-upload-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && liveCameraFace) {
            handleFacePhotoUpload(liveCameraFace, file);
            setLiveCameraFace(null);
          }
        }}
      />

      {/* In-App Live Camera Viewfinder Modal */}
      {liveCameraFace && (
        <LiveCameraModal
          face={liveCameraFace}
          onCapture={handleLiveCameraCapture}
          onClose={() => setLiveCameraFace(null)}
          onSwitchToUpload={() => {
            const input = document.getElementById('global-file-upload-input');
            if (input) input.click();
          }}
        />
      )}

      {/* 3D Video & AI Full Cube Scanner Modal */}
      {is3DScanOpen && (
        <Cube3DScanModal
          onCompleteScan={handleComplete3DScan}
          onClose={() => setIs3DScanOpen(false)}
        />
      )}

      {/* Perspective Cropper Modal (when active) */}
      {croppingFace && capturedFaces[croppingFace]?.imageSrc && (
        <PerspectiveCropper
          face={croppingFace}
          imageSrc={capturedFaces[croppingFace].imageSrc!}
          initialCorners={capturedFaces[croppingFace].corners}
          onConfirm={handleConfirmPerspectiveCrop}
          onCancel={() => setCroppingFace(null)}
          onRescan={(face) => {
            setCroppingFace(null);
            setLiveCameraFace(face);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>4x4 Rubik's Revenge Cube Scanner &amp; Solver</span>
          <span>Perspective Homography Transform • HSV Hue Classification • Three.js WebGL</span>
        </div>
      </footer>
    </div>
  );
}
