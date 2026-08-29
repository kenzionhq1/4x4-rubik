/**
 * Cube3DScanTutorialModal.tsx
 * High-quality interactive SVG animated tutorial overlay for 3D 4x4 Rubik's Cube scanning.
 * Teaches user how to orient and rotate the cube (F -> R -> B -> L -> U -> D).
 */

import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Sparkles,
  CheckCircle2,
  Scan,
  Compass,
  ArrowRight,
  Sun,
  ShieldCheck,
  Play,
} from 'lucide-react';

interface Cube3DScanTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan: () => void;
}

interface TutorialStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  svgType: 'orientation' | 'side_rotation' | 'top_bottom_tilt' | 'square_alignment';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Start with Front & Keep White on Top',
    subtitle: 'The golden rule for standard 3D orientation',
    description:
      'Hold the Front face (Green) directly facing your camera. Keep the White face pointing UP. This White top face serves as the reference for the entire 4-side scanning sequence.',
    badge: 'Step 1 of 4 • Orientation',
    svgType: 'orientation',
  },
  {
    id: 2,
    title: 'Rotate 90° to the Left for 4 Sides',
    subtitle: 'Scan Front (F) → Right (R) → Back (B) → Left (L)',
    description:
      'After each capture, rotate the cube 90° horizontally to your left. Never flip the cube upside-down during this phase—keep White consistently on top!',
    badge: 'Step 2 of 4 • Side Rotation',
    svgType: 'side_rotation',
  },
  {
    id: 3,
    title: 'Tilt UP for White, Tilt DOWN for Yellow',
    subtitle: 'Scan Up (U) and Down (D) faces',
    description:
      'To scan Top (White), tilt the cube UP towards your camera so the Blue face is at the top edge. To scan Bottom (Yellow), tilt the cube DOWN with Green at the top edge.',
    badge: 'Step 3 of 4 • Top & Bottom Tilts',
    svgType: 'top_bottom_tilt',
  },
  {
    id: 4,
    title: 'Fit Inside the 1:1 Square Guide',
    subtitle: 'Optimal distance, lighting & stability',
    description:
      'Align all 16 stickers squarely inside the cyan 1:1 square viewfinder box. Hold steady for 1 second if Auto-Scan is enabled, or press the Capture button.',
    badge: 'Step 4 of 4 • Square Framing',
    svgType: 'square_alignment',
  },
];

export const Cube3DScanTutorialModal: React.FC<Cube3DScanTutorialModalProps> = ({
  isOpen,
  onClose,
  onStartScan,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleFinish = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('rubiks_3d_scan_tutorial_seen', 'true');
      } catch {
        // Ignore storage errors
      }
    }
    onStartScan();
  };

  return (
    <div
      id="cube-3d-scan-tutorial-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-white">3D Cube Scan Tutorial</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Animated SVG Stage */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 border-b border-slate-800 overflow-hidden select-none">
          {/* Subtle Grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />

          {/* SVG Visual 1: Orientation & Top Reference */}
          {step.svgType === 'orientation' && (
            <svg
              viewBox="0 0 400 240"
              className="w-full h-full max-w-[340px] z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            >
              <defs>
                <linearGradient id="topRefGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
                <linearGradient id="frontRefGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <linearGradient id="rightRefGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>

              {/* Glowing Aura */}
              <circle cx="200" cy="125" r="70" fill="#38bdf8" opacity="0.12" className="animate-pulse" />

              {/* Isometric 3D Cube */}
              <g transform="translate(200, 115)">
                {/* Top Face (White) */}
                <polygon
                  points="0,-60 65,-25 0,10 -65,-25"
                  fill="url(#topRefGrad)"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* 4x4 Grid on Top Face */}
                {[-0.5, 0, 0.5].map((off, idx) => (
                  <g key={`top-grid-${idx}`}>
                    <line
                      x1={-65 * (0.25 + idx * 0.25)}
                      y1={-25 * (0.25 + idx * 0.25) + 10 * (1 - (0.25 + idx * 0.25))}
                      x2={65 * (1 - (0.25 + idx * 0.25))}
                      y2={-25 * (1 - (0.25 + idx * 0.25)) - 60 * (0.25 + idx * 0.25)}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      opacity="0.8"
                    />
                    <line
                      x1={65 * (0.25 + idx * 0.25)}
                      y1={-25 * (0.25 + idx * 0.25) + 10 * (1 - (0.25 + idx * 0.25))}
                      x2={-65 * (1 - (0.25 + idx * 0.25))}
                      y2={-25 * (1 - (0.25 + idx * 0.25)) - 60 * (0.25 + idx * 0.25)}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      opacity="0.8"
                    />
                  </g>
                ))}

                {/* Left/Front Face (Green) */}
                <polygon
                  points="-65,-25 0,10 0,80 -65,45"
                  fill="url(#frontRefGrad)"
                  stroke="#052e16"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Right Face (Red) */}
                <polygon
                  points="0,10 65,-25 65,45 0,80"
                  fill="url(#rightRefGrad)"
                  stroke="#450a0a"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Front face label badge */}
                <rect x="-46" y="18" width="32" height="16" rx="4" fill="#0f172a" opacity="0.9" />
                <text x="-30" y="30" fill="#4ade80" fontSize="10" fontWeight="bold" textAnchor="middle">
                  FRONT (F)
                </text>

                {/* Up face label badge */}
                <rect x="-24" y="-38" width="48" height="16" rx="4" fill="#0f172a" opacity="0.9" />
                <text x="0" y="-26" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
                  WHITE (TOP)
                </text>
              </g>

              {/* Upward Glowing Arrow pointing to Top */}
              <g transform="translate(200, 32)">
                <line x1="0" y1="20" x2="0" y2="-5" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                <polygon points="0,-12 -6,-2 6,-2" fill="#38bdf8" />
                <rect x="-42" y="-30" width="84" height="15" rx="4" fill="#0369a1" />
                <text x="0" y="-20" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                  ▲ ALWAYS FACING UP ▲
                </text>
              </g>
            </svg>
          )}

          {/* SVG Visual 2: 4-Side Left Rotation */}
          {step.svgType === 'side_rotation' && (
            <svg
              viewBox="0 0 400 240"
              className="w-full h-full max-w-[340px] z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            >
              {/* Circular Rotation Track Arrow */}
              <g transform="translate(200, 125)">
                {/* Orbit ellipse track */}
                <ellipse cx="0" cy="55" rx="120" ry="24" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

                {/* Animated Glowing Turn Arrow */}
                <path
                  d="M -110,50 A 120 24 0 0 1 110,50"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
                <polygon points="-115,55 -105,45 -118,40" fill="#38bdf8" />

                {/* Center 4x4 Cube representation */}
                <rect x="-42" y="-42" width="84" height="84" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

                {/* 4x4 grid cells */}
                <g opacity="0.9">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const r = Math.floor(i / 4);
                    const c = i % 4;
                    return (
                      <rect
                        key={i}
                        x={-36 + c * 18}
                        y={-36 + r * 18}
                        width="16"
                        height="16"
                        rx="3"
                        fill={i % 2 === 0 ? '#ef4444' : '#b91c1c'}
                        stroke="#0f172a"
                        strokeWidth="1"
                      />
                    );
                  })}
                </g>

                {/* Turn Instruction Badge */}
                <rect x="-70" y="70" width="140" height="22" rx="6" fill="#0369a1" />
                <text x="0" y="85" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                  ⟲ Turn 90° Left (F → R → B → L)
                </text>
              </g>

              {/* Top reference reminder */}
              <g transform="translate(200, 26)">
                <rect x="-55" y="-10" width="110" height="18" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                <text x="0" y="3" fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Keep White Pointing UP
                </text>
              </g>
            </svg>
          )}

          {/* SVG Visual 3: Top (U) & Bottom (D) Tilts */}
          {step.svgType === 'top_bottom_tilt' && (
            <svg
              viewBox="0 0 400 240"
              className="w-full h-full max-w-[340px] z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            >
              {/* Dual Tilt Arrows (Up tilt & Down tilt) */}
              <g transform="translate(125, 115)">
                {/* Up Face Tilt Card */}
                <rect x="-45" y="-45" width="90" height="90" rx="10" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                <g opacity="0.95">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const r = Math.floor(i / 4);
                    const c = i % 4;
                    return (
                      <rect
                        key={i}
                        x={-39 + c * 20}
                        y={-39 + r * 20}
                        width="18"
                        height="18"
                        rx="3"
                        fill="#f8fafc"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                    );
                  })}
                </g>

                {/* Tilt Up Arrow */}
                <path d="M 0,60 Q 30,30 35,-10" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                <polygon points="35,-15 28,-5 42,-5" fill="#38bdf8" />

                <rect x="-45" y="55" width="90" height="20" rx="5" fill="#0369a1" />
                <text x="0" y="69" fill="#ffffff" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                  ▲ Tilt UP for U (White)
                </text>
              </g>

              <g transform="translate(275, 115)">
                {/* Down Face Tilt Card */}
                <rect x="-45" y="-45" width="90" height="90" rx="10" fill="#0f172a" stroke="#eab308" strokeWidth="2" />
                <g opacity="0.95">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const r = Math.floor(i / 4);
                    const c = i % 4;
                    return (
                      <rect
                        key={i}
                        x={-39 + c * 20}
                        y={-39 + r * 20}
                        width="18"
                        height="18"
                        rx="3"
                        fill="#eab308"
                        stroke="#713f12"
                        strokeWidth="1"
                      />
                    );
                  })}
                </g>

                {/* Tilt Down Arrow */}
                <path d="M 0,-60 Q 30,-30 35,10" fill="none" stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
                <polygon points="35,15 28,5 42,5" fill="#eab308" />

                <rect x="-50" y="55" width="100" height="20" rx="5" fill="#854d0e" />
                <text x="0" y="69" fill="#ffffff" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                  ▼ Tilt DOWN for D (Yellow)
                </text>
              </g>
            </svg>
          )}

          {/* SVG Visual 4: 1:1 Square Viewfinder Framing */}
          {step.svgType === 'square_alignment' && (
            <svg
              viewBox="0 0 400 240"
              className="w-full h-full max-w-[340px] z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            >
              {/* Cyan 1:1 Square Viewfinder Box */}
              <g transform="translate(200, 115)">
                {/* Outer guide box (1:1 square) */}
                <rect
                  x="-65"
                  y="-65"
                  width="130"
                  height="130"
                  rx="12"
                  fill="#082f49"
                  fillOpacity="0.5"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="8 4"
                />

                {/* 4 Corner brackets */}
                <path d="M -72,-50 L -72,-72 L -50,-72" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 72,-50 L 72,-72 L 50,-72" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M -72,50 L -72,72 L -50,72" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 72,50 L 72,72 L 50,72" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />

                {/* Inside 4x4 Rubik's Cube Face */}
                {Array.from({ length: 16 }).map((_, i) => {
                  const r = Math.floor(i / 4);
                  const c = i % 4;
                  const colors = ['#22c55e', '#3b82f6', '#ef4444', '#f97316', '#eab308', '#f8fafc'];
                  const color = colors[(r * 2 + c) % colors.length];
                  return (
                    <rect
                      key={i}
                      x={-56 + c * 29}
                      y={-56 + r * 29}
                      width="26"
                      height="26"
                      rx="4"
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Top Reference Ribbon */}
                <rect x="-50" y="-84" width="100" height="16" rx="4" fill="#0284c7" />
                <text x="0" y="-72" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                  ▲ Top Face Reference ▲
                </text>
              </g>

              {/* Status Badge */}
              <g transform="translate(200, 222)">
                <rect x="-65" y="-12" width="130" height="20" rx="6" fill="#065f46" stroke="#10b981" strokeWidth="1" />
                <text x="0" y="2" fill="#6ee7b7" fontSize="10" fontWeight="bold" textAnchor="middle">
                  ✓ 1:1 Square Aligned
                </text>
              </g>
            </svg>
          )}

          {/* Step Badge in bottom left */}
          <div className="absolute bottom-3 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-[11px] font-bold text-cyan-300">
            {step.badge}
          </div>
        </div>

        {/* Text Content */}
        <div className="p-5 flex flex-col gap-2.5">
          <h3 className="text-base sm:text-lg font-extrabold text-white">{step.title}</h3>
          <p className="text-xs font-semibold text-cyan-400">{step.subtitle}</p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{step.description}</p>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2 py-1">
          {TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20"
            />
            <span>Don't show automatically next time</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((p) => p - 1)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {!isLastStep ? (
              <button
                type="button"
                onClick={() => setCurrentStep((p) => p + 1)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-extrabold shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start 3D Cube Scan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
