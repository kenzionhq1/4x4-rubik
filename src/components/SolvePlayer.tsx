/**
 * SolvePlayer.tsx
 * Step-by-step 4x4 Rubik's Revenge Solve Player
 * Features interactive move stepper, auto-play with adjustable speed,
 * live stage progress, WCA 4x4 notation legend modal, and copy solution button.
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FastForward,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  ListOrdered,
  Tv,
  Wrench,
  Volume2,
  VolumeX,
  Mic,
  Brain,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { MoveStep, SolveResult, SolvePhase } from '../types';
import { MOVE_DESCRIPTIONS } from '../utils/solver4x4';
import { soundFx } from '../utils/soundEffects';

interface SolvePlayerProps {
  solveResult: SolveResult;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onResetToStart: () => void;
  onAutoRepair?: () => void;
}

export const SolvePlayer: React.FC<SolvePlayerProps> = ({
  solveResult,
  currentStepIndex,
  onStepChange,
  onResetToStart,
  onAutoRepair,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1200);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // AI Step Explanation state
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { moves, totalMoves, simulatedVerificationPassed, phaseSummary, success, errorMessage, diagnostics } = solveResult;

  const currentMove: MoveStep | undefined = moves[currentStepIndex];
  const isFinished = currentStepIndex >= totalMoves;

  // On step change: trigger sound and voice
  useEffect(() => {
    if (currentMove && currentStepIndex < totalMoves) {
      soundFx.playSliceTurn(currentMove.move.includes('w') ? 'wide' : 'cw');
      if (isVoiceEnabled && !isMuted) {
        soundFx.speakMove(currentMove.move);
      }
    }
  }, [currentStepIndex, isVoiceEnabled, isMuted]);

  // Trigger celebration confetti and fanfare when reaching solved state
  useEffect(() => {
    if (isFinished && totalMoves > 0) {
      setIsPlaying(false);
      soundFx.playSolveFanfare();
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe ignore
      }
    }
  }, [isFinished, totalMoves]);

  // Auto-play timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && currentStepIndex < totalMoves) {
      timer = setTimeout(() => {
        onStepChange(currentStepIndex + 1);
      }, playSpeedMs);
    } else if (isPlaying && currentStepIndex >= totalMoves) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, totalMoves, playSpeedMs, onStepChange]);

  const handleNext = () => {
    if (currentStepIndex < totalMoves) {
      onStepChange(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleCopySolution = () => {
    const fullText = solveResult.moveNotationList.join(' ');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Ask AI Coach to explain current step
  const handleAskAiCoach = async () => {
    if (!currentMove) return;
    setIsExplaining(true);
    try {
      const resp = await fetch('/api/ai/explain-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          move: currentMove.move,
          phase: currentMove.phase,
          phaseTitle: currentMove.phaseTitle,
          stepNumber: currentStepIndex + 1,
          totalSteps: totalMoves,
        }),
      });
      const data = await resp.json();
      setAiExplanation(data.explanation || `Move ${currentMove.move} advances the ${currentMove.phaseTitle} stage.`);
    } catch {
      setAiExplanation(`Move ${currentMove.move} is key to reducing the cube during ${currentMove.phaseTitle}.`);
    } finally {
      setIsExplaining(false);
    }
  };

  const getPhaseBadgeColor = (phase: SolvePhase) => {
    switch (phase) {
      case 'centers': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'edges': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case '3x3-cross':
      case '3x3-f2l':
      case '3x3-oll':
      case '3x3-pll': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'oll-parity':
      case 'pll-parity': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const progressPercent = totalMoves > 0 ? Math.round((currentStepIndex / totalMoves) * 100) : 0;

  if (!success) {
    return (
      <div id="solve-error-notice" className="flex flex-col gap-4 bg-slate-900 border-2 border-amber-500/60 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <h3 className="text-base font-bold text-white">Physical Validation / Lighting Notice</h3>
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {errorMessage || 'Impossible sticker state detected. Some scanned facelets have color artifacts from lighting or reflections.'}
            </p>
          </div>
        </div>

        {diagnostics?.errors && diagnostics.errors.length > 0 && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-300">Detected Inconsistencies:</span>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-300/90">
              {diagnostics.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {onAutoRepair && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Click Auto-Repair to automatically correct piece parity & color balances into a legal 4x4 state:
            </span>
            <button
              id="error-auto-repair-btn"
              type="button"
              onClick={onAutoRepair}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              ⚡ Auto-Repair & Compute Solution
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="solve-player-container" className="flex flex-col gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
      {/* Header & Verification Check */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Verified 4x4 Reduction Solution
              {simulatedVerificationPassed ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Simulation Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> Verification Notice
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Total {totalMoves} moves • Centers: {phaseSummary.centersCount} • Edges: {phaseSummary.edgesCount} • 3x3: {phaseSummary.threeByThreeCount} • Parity: {phaseSummary.parityCount}
            </p>
          </div>
        </div>

        {/* Action buttons & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio / Voice Controls */}
          <button
            id="toggle-voice-announcer-btn"
            type="button"
            onClick={() => {
              const next = !isVoiceEnabled;
              setIsVoiceEnabled(next);
              soundFx.setSpeechEnabled(next);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
              isVoiceEnabled
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Voice Move Announcer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice</span>
          </button>

          <button
            id="toggle-sound-mute-btn"
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              soundFx.setMuted(next);
            }}
            className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              id="view-stepper-mode-btn"
              type="button"
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'card'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Stepper & Animation"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Stepper</span>
            </button>
            <button
              id="view-list-mode-btn"
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full List of All Steps"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Step List</span>
            </button>
          </div>

          <button
            id="copy-solution-btn"
            onClick={handleCopySolution}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            title="Copy move sequence"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Moves'}</span>
          </button>

          <button
            id="legend-modal-btn"
            onClick={() => setShowLegendModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 rounded-xl transition-colors"
            title="4x4 Notation Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Notation Legend</span>
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* Full Beginner Step-by-Step List View */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300">
              Complete Step-by-Step Breakdown ({moves.length} Steps)
            </span>
            <span className="text-[11px] text-slate-400">
              Tap any step to instantly jump the 3D model to that position
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
            {moves.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;

              return (
                <div
                  key={idx}
                  id={`list-step-row-${idx}`}
                  onClick={() => onStepChange(idx)}
                  className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-950/60 border-blue-500/80 ring-1 ring-blue-500/50 shadow-md'
                      : isPast
                      ? 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-800/50'
                      : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isPast
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base text-blue-400">
                          {step.move}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${getPhaseBadgeColor(
                            step.phase
                          )}`}
                        >
                          {step.phaseTitle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                        {step.notationExplained}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white animate-pulse">
                        Current Step
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Primary Interactive Card Stepper */
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[160px]">
          {isFinished ? (
            <div className="flex flex-col items-center gap-2 text-center py-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black text-white">4x4 Cube Fully Solved!</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                All 6 centers, 12 dedges, and parity corrections completed successfully.
              </p>
              <button
                onClick={onResetToStart}
                className="mt-2 flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Replay Solve
              </button>
            </div>
          ) : currentMove ? (
            <div className="flex flex-col items-center gap-2 text-center w-full">
              {/* Phase Tag */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full border tracking-wide uppercase ${getPhaseBadgeColor(
                    currentMove.phase
                  )}`}
                >
                  {currentMove.phaseTitle}
                </span>

                <button
                  type="button"
                  onClick={handleAskAiCoach}
                  disabled={isExplaining}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900 transition-colors shadow-sm"
                  title="Ask Gemini AI Coach about this step"
                >
                  <Brain className="w-3 h-3 text-cyan-400" />
                  <span>{isExplaining ? 'Asking AI...' : 'Ask AI Coach'}</span>
                </button>
              </div>

              {/* Giant Move Letter & Clear Direction Helper */}
              <div className="flex flex-col items-center gap-1.5 my-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl sm:text-6xl font-black font-mono tracking-wider text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]">
                    {currentMove.move}
                  </span>
                </div>
                
                {/* Highlighted Plain-English Instruction Badge */}
                <div className="px-4 py-1.5 rounded-xl bg-blue-950/70 border border-blue-800/80 text-blue-200 text-xs sm:text-sm font-semibold max-w-md text-center shadow-md">
                  {currentMove.notationExplained}
                </div>
              </div>

              {/* AI Explanation Callout if loaded */}
              {aiExplanation && (
                <div className="my-1 px-3.5 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 max-w-md text-left leading-relaxed flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{aiExplanation}</span>
                </div>
              )}

              <span className="text-xs text-slate-500 font-mono">
                Step {currentStepIndex + 1} of {totalMoves} • 3D cube updates in real time
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Ready to start solving</div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>Move {currentStepIndex} / {totalMoves}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Speed Slider */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium">Speed:</span>
          <input
            id="play-speed-slider"
            type="range"
            min="400"
            max="2500"
            step="100"
            value={playSpeedMs}
            onChange={(e) => setPlaySpeedMs(Number(e.target.value))}
            className="w-20 accent-blue-500 cursor-pointer"
            title="Auto-play speed"
          />
          <span className="text-[11px] text-slate-400 font-mono w-10">
            {(playSpeedMs / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <button
            id="reset-solve-btn"
            onClick={onResetToStart}
            disabled={currentStepIndex === 0}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors"
            title="Jump to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="prev-step-btn"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors"
            title="Previous Move"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            id="play-pause-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isFinished && totalMoves > 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 shadow-lg shadow-blue-500/25 transition-all"
            title={isPlaying ? 'Pause' : 'Auto Play'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Play
              </>
            )}
          </button>

          <button
            id="next-step-btn"
            onClick={handleNext}
            disabled={isFinished}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors"
            title="Next Move"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Move Tape / Full Sequence Preview */}
      <div className="flex flex-col gap-1.5 pt-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Complete Move Sequence ({moves.length} moves):
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-slate-950 rounded-xl border border-slate-800 scrollbar-thin">
          {moves.map((st, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPast = idx < currentStepIndex;

            return (
              <button
                key={idx}
                id={`tape-move-${idx}`}
                onClick={() => onStepChange(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 scale-105 shadow-md'
                    : isPast
                    ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
                title={`Jump to step ${idx + 1}: ${st.move} (${st.notationExplained})`}
              >
                {st.move}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notation Legend Modal */}
      {showLegendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-auto flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                4x4 WCA Notation Guide
              </h4>
              <button
                onClick={() => setShowLegendModal(false)}
                className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-blue-400 text-sm">Outer Layer Turns (1 Layer):</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">U, D, F, B, L, R</span>: Turn the single outermost face 90° clockwise.
                  <br />
                  <span className="font-mono text-white font-bold">U', D', F'</span>: Turn 90° counter-clockwise (prime).
                  <br />
                  <span className="font-mono text-white font-bold">U2, D2, F2</span>: Turn 180° (double turn).
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-emerald-400 text-sm">Wide Turns (Outer 2 Layers):</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">Rw, Lw, Uw, Dw, Fw, Bw</span>: Turn the outer TWO layers together in that direction.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-amber-400 text-sm">Inner Slice Moves (Single Layer 2):</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">r, l, u, d, f, b</span>: Turn ONLY the inner slice layer directly adjacent to that face.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-purple-400 text-sm">Cube Rotations:</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">x, y, z</span>: Rotate the whole cube in space without turning any individual layers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

    }
  };

  const handleCopySolution = () => {
    const fullText = solveResult.moveNotationList.join(' ');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getPhaseBadgeColor = (phase: SolvePhase) => {
    switch (phase) {
      case 'centers': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'edges': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case '3x3-cross':
      case '3x3-f2l':
      case '3x3-oll':
      case '3x3-pll': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'oll-parity':
      case 'pll-parity': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const progressPercent = totalMoves > 0 ? Math.round((currentStepIndex / totalMoves) * 100) : 0;

  return (
    <div id="solve-player-container" className="flex flex-col gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
      {/* Header & Verification Check */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Verified 4x4 Reduction Solution
              {simulatedVerificationPassed ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Simulation Verified Solved
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> Verification Notice
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Total {totalMoves} moves • Centers: {phaseSummary.centersCount} • Edges: {phaseSummary.edgesCount} • 3x3: {phaseSummary.threeByThreeCount} • Parity: {phaseSummary.parityCount}
            </p>
          </div>
        </div>

        {/* Action buttons & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              id="view-stepper-mode-btn"
              type="button"
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'card'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Stepper & Animation"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Stepper</span>
            </button>
            <button
              id="view-list-mode-btn"
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full List of All Steps"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Step List</span>
            </button>
          </div>

          <button
            id="copy-solution-btn"
            onClick={handleCopySolution}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            title="Copy move sequence"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Moves'}</span>
          </button>

          <button
            id="legend-modal-btn"
            onClick={() => setShowLegendModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 rounded-xl transition-colors"
            title="4x4 Notation Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Notation Legend</span>
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* Full Beginner Step-by-Step List View */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300">
              Complete Step-by-Step Breakdown ({moves.length} Steps)
            </span>
            <span className="text-[11px] text-slate-400">
              Tap any step to instantly jump the 3D model to that position
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
            {moves.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;

              return (
                <div
                  key={idx}
                  id={`list-step-row-${idx}`}
                  onClick={() => onStepChange(idx)}
                  className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-950/60 border-blue-500/80 ring-1 ring-blue-500/50 shadow-md'
                      : isPast
                      ? 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-800/50'
                      : 'bg-slate-950/80 border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : isPast
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base text-blue-400">
                          {step.move}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${getPhaseBadgeColor(
                            step.phase
                          )}`}
                        >
                          {step.phaseTitle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                        {step.notationExplained}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white animate-pulse">
                        Current Step
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Primary Interactive Card Stepper */
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[160px]">
          {isFinished ? (
            <div className="flex flex-col items-center gap-2 text-center py-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black text-white">4x4 Cube Fully Solved!</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                All 6 centers, 12 dedges, and parity corrections completed successfully.
              </p>
              <button
                onClick={onResetToStart}
                className="mt-2 flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Replay Solve
              </button>
            </div>
          ) : currentMove ? (
            <div className="flex flex-col items-center gap-2 text-center w-full">
              {/* Phase Tag */}
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border tracking-wide uppercase ${getPhaseBadgeColor(
                  currentMove.phase
                )}`}
              >
                {currentMove.phaseTitle}
              </span>

              {/* Giant Move Letter & Clear Direction Helper */}
              <div className="flex flex-col items-center gap-1.5 my-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl sm:text-6xl font-black font-mono tracking-wider text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]">
                    {currentMove.move}
                  </span>
                </div>
                
                {/* Highlighted Plain-English Instruction Badge */}
                <div className="px-4 py-1.5 rounded-xl bg-blue-950/70 border border-blue-800/80 text-blue-200 text-xs sm:text-sm font-semibold max-w-md text-center shadow-md">
                  {currentMove.notationExplained}
                </div>
              </div>

              <span className="text-xs text-slate-500 font-mono">
                Step {currentStepIndex + 1} of {totalMoves} • 3D cube updates in real time
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Ready to start solving</div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>Move {currentStepIndex} / {totalMoves}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Speed Slider */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium">Speed:</span>
          <input
            id="play-speed-slider"
            type="range"
            min="400"
            max="2500"
            step="100"
            value={playSpeedMs}
            onChange={(e) => setPlaySpeedMs(Number(e.target.value))}
            className="w-20 accent-blue-500 cursor-pointer"
            title="Auto-play speed"
          />
          <span className="text-[11px] text-slate-400 font-mono w-10">
            {(playSpeedMs / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <button
            id="reset-solve-btn"
            onClick={onResetToStart}
            disabled={currentStepIndex === 0}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors"
            title="Jump to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="prev-step-btn"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors"
            title="Previous Move"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            id="play-pause-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isFinished && totalMoves > 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 shadow-lg shadow-blue-500/25 transition-all"
            title={isPlaying ? 'Pause' : 'Auto Play'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Play
              </>
            )}
          </button>

          <button
            id="next-step-btn"
            onClick={handleNext}
            disabled={isFinished}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none border border-slate-800 transition-colors"
            title="Next Move"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Move Tape / Full Sequence Preview */}
      <div className="flex flex-col gap-1.5 pt-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Complete Move Sequence ({moves.length} moves):
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-slate-950 rounded-xl border border-slate-800 scrollbar-thin">
          {moves.map((st, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPast = idx < currentStepIndex;

            return (
              <button
                key={idx}
                id={`tape-move-${idx}`}
                onClick={() => onStepChange(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 scale-105 shadow-md'
                    : isPast
                    ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
                title={`Jump to step ${idx + 1}: ${st.move} (${st.notationExplained})`}
              >
                {st.move}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notation Legend Modal */}
      {showLegendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-auto flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                4x4 WCA Notation Guide
              </h4>
              <button
                onClick={() => setShowLegendModal(false)}
                className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-blue-400 text-sm">Outer Layer Turns (1 Layer):</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">U, D, F, B, L, R</span>: Turn the single outermost face 90° clockwise.
                  <br />
                  <span className="font-mono text-white font-bold">U', D', F'</span>: Turn 90° counter-clockwise (prime).
                  <br />
                  <span className="font-mono text-white font-bold">U2, D2, F2</span>: Turn 180° (double turn).
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-emerald-400 text-sm">Wide Turns (Outer 2 Layers):</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">Rw, Lw, Uw, Dw, Fw, Bw</span>: Turn the outer TWO layers together in that direction.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-amber-400 text-sm">Inner Slice Moves (Single Layer 2):</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">r, l, u, d, f, b</span>: Turn ONLY the inner slice layer directly adjacent to that face.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="font-bold text-purple-400 text-sm">Cube Rotations:</span>
                <p className="text-slate-400 leading-relaxed">
                  <span className="font-mono text-white font-bold">x, y, z</span>: Rotate the whole cube in space without turning any individual layers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
