/**
 * PerspectiveCropper.tsx
 * Overlays 4 draggable corner handles on the captured face photo,
 * applies projective homography transform, renders the projected 4x4 grid,
 * and samples sticker colors with HSV classification.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, X, Eye, AlertCircle, RotateCw, RotateCcw, FlipHorizontal, Camera, Sparkles, Loader2 } from 'lucide-react';
import { FaceName, Point2D, StickerState, FACE_METADATA, CubeColor } from '../types';
import { getSamplingGridPoints, getSquareToQuadHomography, transformPoint } from '../utils/homography';
import { classifyColor, samplePixelPatch } from '../utils/colorDetection';

interface PerspectiveCropperProps {
  face: FaceName;
  imageSrc: string;
  initialCorners?: [Point2D, Point2D, Point2D, Point2D];
  onConfirm: (corners: [Point2D, Point2D, Point2D, Point2D], sampledStickers: StickerState[]) => void;
  onCancel: () => void;
  onRescan?: (face: FaceName) => void;
}

export const PerspectiveCropper: React.FC<PerspectiveCropperProps> = ({
  face,
  imageSrc,
  initialCorners,
  onConfirm,
  onCancel,
  onRescan,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [corners, setCorners] = useState<[Point2D, Point2D, Point2D, Point2D]>(
    initialCorners || [
      { x: 0.15, y: 0.15 }, // TL
      { x: 0.85, y: 0.15 }, // TR
      { x: 0.85, y: 0.85 }, // BR
      { x: 0.15, y: 0.85 }, // BL
    ]
  );
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const [liveSamples, setLiveSamples] = useState<StickerState[]>([]);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [aiDetectedNote, setAiDetectedNote] = useState<string | null>(null);

  // Load image onto hidden canvas for pixel extraction
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          updateSamples(corners, img.width, img.height, ctx);
        }
      }
    };
  }, [imageSrc]);

  // Compute live sampling based on homography
  const updateSamples = (
    currentCorners: [Point2D, Point2D, Point2D, Point2D],
    imgW: number,
    imgH: number,
    ctxParam?: CanvasRenderingContext2D
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = ctxParam || canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const H = getSquareToQuadHomography(currentCorners);
    const gridPoints = getSamplingGridPoints(H);

    const samples: StickerState[] = gridPoints.map((pt) => {
      const pixelX = pt.x * imgW;
      const pixelY = pt.y * imgH;
      const [r, g, b] = samplePixelPatch(ctx, pixelX, pixelY, 3);
      const { color, uncertain, confidence } = classifyColor(r, g, b);
      return {
        color,
        uncertain,
        confidence,
        rawRgb: [r, g, b],
      };
    });

    setLiveSamples(samples);
  };

  // AI Single Face Vision with Gemini 3.7 Flash
  const handleAiScanFace = async () => {
    setIsAiScanning(true);
    setAiDetectedNote(null);

    try {
      const response = await fetch('/api/ai/scan-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageSrc, faceName: face }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.stickers) && data.stickers.length === 16) {
        const aiStickers: StickerState[] = data.stickers.map((c: string) => ({
          color: (['W', 'Y', 'R', 'O', 'B', 'G'].includes(c) ? c : 'W') as CubeColor,
          uncertain: false,
          confidence: data.confidence ?? 0.98,
        }));
        setLiveSamples(aiStickers);
        setAiDetectedNote(`Gemini Vision: ${data.detectedLighting || 'Accurate'} lighting analyzed.`);
      }
    } catch (e: any) {
      console.warn('AI scan error:', e);
      setAiDetectedNote('Local homography color analysis applied.');
    } finally {
      setIsAiScanning(false);
    }
  };

  // Drag interaction handlers
  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeHandle === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const normX = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    const normY = Math.max(0.02, Math.min(0.98, (clientY - rect.top) / rect.height));

    setCorners((prev) => {
      const next: [Point2D, Point2D, Point2D, Point2D] = [prev[0], prev[1], prev[2], prev[3]];
      next[activeHandle] = { x: normX, y: normY };
      if (imageDimensions.width > 0) {
        updateSamples(next, imageDimensions.width, imageDimensions.height);
      }
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
      setActiveHandle(null);
    }
  };

  const handleRotateCornersCW = () => {
    // Rotate corners 90 deg clockwise: TL(0)->TR(1)->BR(2)->BL(3)->TL(0)
    setCorners((prev) => {
      const next: [Point2D, Point2D, Point2D, Point2D] = [
        prev[3], // new TL is old BL
        prev[0], // new TR is old TL
        prev[1], // new BR is old TR
        prev[2], // new BL is old BR
      ];
      if (imageDimensions.width > 0) {
        updateSamples(next, imageDimensions.width, imageDimensions.height);
      }
      return next;
    });
  };

  const handleRotateCornersCCW = () => {
    // Rotate corners 90 deg counter-clockwise: TL(0)->BL(3)->BR(2)->TR(1)->TL(0)
    setCorners((prev) => {
      const next: [Point2D, Point2D, Point2D, Point2D] = [
        prev[1], // new TL is old TR
        prev[2], // new TR is old BR
        prev[3], // new BR is old BL
        prev[0], // new BL is old TL
      ];
      if (imageDimensions.width > 0) {
        updateSamples(next, imageDimensions.width, imageDimensions.height);
      }
      return next;
    });
  };

  const handleFlipHorizontal = () => {
    setCorners((prev) => {
      const next: [Point2D, Point2D, Point2D, Point2D] = [
        prev[1], // TL becomes TR
        prev[0], // TR becomes TL
        prev[3], // BR becomes BL
        prev[2], // BL becomes BR
      ];
      if (imageDimensions.width > 0) {
        updateSamples(next, imageDimensions.width, imageDimensions.height);
      }
      return next;
    });
  };

  const handleResetCorners = () => {
    const defaultCorners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 0.15, y: 0.15 },
      { x: 0.85, y: 0.15 },
      { x: 0.85, y: 0.85 },
      { x: 0.15, y: 0.85 },
    ];
    setCorners(defaultCorners);
    if (imageDimensions.width > 0) {
      updateSamples(defaultCorners, imageDimensions.width, imageDimensions.height);
    }
  };

  const handleConfirm = () => {
    onConfirm(corners, liveSamples);
  };

  // Generate SVG polygon string and internal grid lines
  const polygonPoints = corners.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(' ');
  const H = getSquareToQuadHomography(corners);
  const samplePointsNorm = getSamplingGridPoints(H);

  // Compute inner 4x4 grid line segments
  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const frac = i / 4;
    // Horizontal lines: (0, frac) to (1, frac)
    const pL = transformPoint(0, frac, H);
    const pR = transformPoint(1, frac, H);
    gridLines.push({ x1: pL.x * 100, y1: pL.y * 100, x2: pR.x * 100, y2: pR.y * 100 });

    // Vertical lines: (frac, 0) to (frac, 1)
    const pT = transformPoint(frac, 0, H);
    const pB = transformPoint(frac, 1, H);
    gridLines.push({ x1: pT.x * 100, y1: pT.y * 100, x2: pB.x * 100, y2: pB.y * 100 });
  }

  const handleLabels = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'];

  return (
    <div id="perspective-cropper-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Face {face}
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Align Perspective &amp; Crop
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag the 4 corner circles to match the outer sticker boundary of the {FACE_METADATA[face].label}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRescan && (
              <button
                id="cropper-rescan-header-btn"
                type="button"
                onClick={() => onRescan(face)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900 border border-blue-800/80 rounded-xl transition-all shadow-sm"
                title="Retake or re-scan photo for this face"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Rescan Photo</span>
              </button>
            )}
            <button
              id="close-cropper-button"
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Face Reference & Orientation Direction Banner */}
        <div className="bg-blue-950/70 border-b border-blue-800/40 px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-blue-200 font-medium">{FACE_METADATA[face].holdInstruction}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-200 border border-blue-700/50 shrink-0">
            {FACE_METADATA[face].topFaceRef}
          </span>
        </div>

        {/* Viewport Canvas & Interactive Area */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-950/50">
          <div
            ref={containerRef}
            id="perspective-drag-area"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-full max-w-lg aspect-square bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800 touch-none select-none"
          >
            {/* Base photo */}
            {imageLoaded ? (
              <img
                src={imageSrc}
                alt={`Face ${face} photo`}
                className="w-full h-full object-contain pointer-events-none"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                Loading photo...
              </div>
            )}

            {/* Homography Quadrilateral and Grid Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Shaded background outside quad */}
              <polygon
                points={polygonPoints}
                fill="rgba(59, 130, 246, 0.12)"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Internal 4x4 Grid Guide Lines */}
              {gridLines.map((line, idx) => (
                <line
                  key={idx}
                  x1={`${line.x1}%`}
                  y1={`${line.y1}%`}
                  x2={`${line.x2}%`}
                  y2={`${line.y2}%`}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
              ))}

              {/* 16 Live Sampling Center Dots */}
              {samplePointsNorm.map((pt, idx) => {
                const sample = liveSamples[idx];
                const dotColor = sample ? (
                  sample.color === 'W' ? '#ffffff' :
                  sample.color === 'Y' ? '#facc15' :
                  sample.color === 'R' ? '#ef4444' :
                  sample.color === 'O' ? '#f97316' :
                  sample.color === 'B' ? '#3b82f6' : '#22c55e'
                ) : '#38bdf8';

                return (
                  <g key={idx}>
                    <circle
                      cx={`${pt.x * 100}%`}
                      cy={`${pt.y * 100}%`}
                      r="5.5"
                      fill={dotColor}
                      stroke={sample?.uncertain ? '#ef4444' : '#0f172a'}
                      strokeWidth={sample?.uncertain ? '2' : '1.5'}
                      strokeDasharray={sample?.uncertain ? '2 2' : 'none'}
                    />
                  </g>
                );
              })}
            </svg>

            {/* 4 Interactive Corner Handles */}
            {corners.map((corner, index) => {
              const cornerBadges = ['TL', 'TR', 'BR', 'BL'];
              return (
                <div
                  key={index}
                  id={`corner-handle-${index}`}
                  onPointerDown={(e) => handlePointerDown(index, e)}
                  style={{
                    left: `${corner.x * 100}%`,
                    top: `${corner.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute w-8 h-8 rounded-full border-2 cursor-grab active:cursor-grabbing flex items-center justify-center shadow-lg transition-transform ${
                    activeHandle === index
                      ? 'scale-125 bg-blue-500 border-white text-white z-20'
                      : 'bg-white/95 border-blue-600 text-blue-800 hover:scale-110 z-10'
                  }`}
                  title={`${handleLabels[index]} (${cornerBadges[index]})`}
                >
                  <span className="text-[9px] font-black">{cornerBadges[index]}</span>
                </div>
              );
            })}
          </div>

          {/* Live 4x4 Sampling Preview strip */}
          <div className="w-full max-w-lg mt-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Live Detected 4x4 Grid (16 stickers):
              </span>
              <span className="text-[11px] text-slate-400">
                {liveSamples.filter((s) => s.uncertain).length > 0 ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {liveSamples.filter((s) => s.uncertain).length} uncertain
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">All confident ✓</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-lg w-36 mx-auto">
              {liveSamples.map((st, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shadow-sm ${
                    st.color === 'W' ? 'bg-white text-slate-900' :
                    st.color === 'Y' ? 'bg-yellow-400 text-slate-950' :
                    st.color === 'R' ? 'bg-red-500 text-white' :
                    st.color === 'O' ? 'bg-orange-500 text-white' :
                    st.color === 'B' ? 'bg-blue-500 text-white' :
                    'bg-green-500 text-white'
                  } ${st.uncertain ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-slate-950 border border-dashed border-red-400' : ''}`}
                >
                  {st.color}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-1.5">
            <button
              id="rotate-ccw-button"
              type="button"
              onClick={handleRotateCornersCCW}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              title="Rotate grid 90° counter-clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rotate 90°</span>
            </button>
            <button
              id="rotate-cw-button"
              type="button"
              onClick={handleRotateCornersCW}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              title="Rotate grid 90° clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              id="flip-horiz-button"
              type="button"
              onClick={handleFlipHorizontal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              title="Flip grid horizontally"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              id="reset-corners-button"
              type="button"
              onClick={handleResetCorners}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
              title="Reset corners to default"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* AI Detect Button */}
            <button
              id="cropper-ai-scan-btn"
              type="button"
              onClick={handleAiScanFace}
              disabled={isAiScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 rounded-xl transition-all shadow-sm"
              title="Classify colors with Gemini 3.7 Vision AI"
            >
              {isAiScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Scanning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gemini AI Scan</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onRescan && (
              <button
                id="cropper-rescan-footer-btn"
                type="button"
                onClick={() => onRescan(face)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                title="Retake photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Rescan</span>
              </button>
            )}
            <button
              id="cancel-crop-button"
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-crop-button"
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              Confirm &amp; Apply Face
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
