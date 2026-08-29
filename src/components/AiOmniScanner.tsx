/**
 * AiOmniScanner.tsx
 * AI-Powered Omni-Directional 4x4 Rubik's Cube Scanner.
 * Allows users to snap or upload photos in ANY arbitrary order and ANY orientation
 * (no need to specify Front, Down, Back, Right, etc.).
 * Powered by Gemini 3.7 Flash spatial topology & color reasoning.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Play,
  Layers,
  ArrowRight,
  Eye,
  Info,
  Check,
  Zap,
  Trash2,
  Plus,
  HelpCircle,
  Volume2,
} from 'lucide-react';
import { FaceName, CubeColor, CubeState, StickerState, CUBE_COLORS, FACE_NAMES } from '../types';
import { soundFx } from '../utils/soundEffects';
import { optimizeImageFile } from '../utils/imageOptimizer';

interface PhotoItem {
  id: string;
  dataUrl: string;
  assignedFace?: FaceName;
  rotationDeg?: number;
  confidence?: number;
  reasoning?: string;
}

interface AiOmniScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyState: (scannedState: CubeState, photosMap?: Record<FaceName, string>) => void;
}

export const AiOmniScanner: React.FC<AiOmniScannerProps> = ({
  isOpen,
  onClose,
  onApplyState,
}) => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [detectedState, setDetectedState] = useState<CubeState | null>(null);
  const [colorCounts, setColorCounts] = useState<Record<string, number> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start / Stop camera stream
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access unavailable. You can upload photos directly from your device.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && photos.length === 0) {
      startCamera('environment');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Capture frame from active video
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    soundFx.playCameraSnap();

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    // Lock to strict square
    const minDim = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = minDim;
    canvas.height = minDim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const sx = ((video.videoWidth || minDim) - minDim) / 2;
    const sy = ((video.videoHeight || minDim) - minDim) / 2;
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, minDim, minDim);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const newPhoto: PhotoItem = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      dataUrl,
    };

    setPhotos((prev) => [...prev, newPhoto]);
    setDetectedState(null);
    setAiSummary(null);
  };

  // Upload photos via file picker
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: PhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const optimized = await optimizeImageFile(files[i], 1024, 0.85);
        newPhotos.push({
          id: `upload_${Date.now()}_${i}`,
          dataUrl: optimized,
        });
      } catch (err) {
        console.error('File optimization error:', err);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    setDetectedState(null);
    setAiSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove photo
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setDetectedState(null);
    setAiSummary(null);
  };

  // Run AI Omni-Scan on all collected photos
  const handleRunAiOmniScan = async () => {
    if (photos.length === 0) return;
    setIsScanning(true);
    setErrorMessage(null);

    try {
      const payload = {
        images: photos.map((p) => p.dataUrl),
      };

      const resp = await fetch('/api/ai/omni-scan-cube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }

      const data = await resp.json();
      if (data.success && data.faces) {
        soundFx.playAiCompleteChime();

        // Convert string arrays to CubeState format
        const parsedState: CubeState = {
          U: [],
          L: [],
          F: [],
          R: [],
          B: [],
          D: [],
        };

        (Object.keys(data.faces) as FaceName[]).forEach((face) => {
          const colorList = data.faces[face] as string[];
          parsedState[face] = colorList.map((code) => ({
            color: (['W', 'Y', 'R', 'O', 'B', 'G'].includes(code) ? code : 'W') as CubeColor,
            uncertain: false,
            confidence: data.confidence ?? 0.95,
          }));
        });

        // Update photo mappings with AI deductions
        if (Array.isArray(data.photoMappings)) {
          setPhotos((prev) =>
            prev.map((photo, idx) => {
              const match = data.photoMappings.find((m: any) => m.photoIndex === idx);
              if (match) {
                return {
                  ...photo,
                  assignedFace: match.assignedFace,
                  rotationAppliedDeg: match.rotationAppliedDeg,
                  confidence: match.confidence,
                  reasoning: match.reasoning,
                };
              }
              return photo;
            })
          );
        }

        setDetectedState(parsedState);
        setColorCounts(data.colorCounts || null);
        setAiSummary(data.aiSummary || 'AI successfully analyzed and aligned all faces into standard 3D coordinates.');
      } else {
        throw new Error(data.error || 'Failed to detect cube state with AI.');
      }
    } catch (err: any) {
      console.error('Omni-Scan AI error:', err);
      setErrorMessage(err.message || 'AI Omni-Scan could not recognize the photos. Please ensure good lighting and clear 4x4 faces.');
    } finally {
      setIsScanning(false);
    }
  };

  // Apply state to main app
  const handleConfirmAndSolve = () => {
    if (!detectedState) return;
    const photosMap: Record<FaceName, string> = {
      U: '',
      L: '',
      F: '',
      R: '',
      B: '',
      D: '',
    };
    photos.forEach((p) => {
      if (p.assignedFace && p.dataUrl) {
        photosMap[p.assignedFace] = p.dataUrl;
      }
    });

    onApplyState(detectedState, photosMap);
    stopCamera();
    onClose();
  };

  return (
    <div
      id="ai-omni-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">AI Omni-Directional 4x4 Scanner</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Gemini 3.7 AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Snap or upload photos in <strong className="text-cyan-300">ANY order</strong> and <strong className="text-cyan-300">ANY rotation</strong> — AI figures out the 3D cube model!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Top AI Instructions Banner */}
          <div className="bg-gradient-to-r from-blue-950/50 via-slate-900 to-indigo-950/50 p-4 rounded-2xl border border-cyan-500/30 flex items-start gap-3.5 shadow-md">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 mt-0.5 flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <span className="font-bold text-white">No orientation rules needed!</span> You don't need to know which face is Front or keep White on top. Just snap/upload clear photos of each of the 6 faces. The AI vision engine deduces the center blocks, rotates and connects all edges into standard 4x4 coordinates.
            </div>
          </div>

          {/* Dual Input Area: Live Camera View + Upload Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live Camera Viewport */}
            <div className="relative aspect-square w-full max-w-[380px] mx-auto bg-black rounded-2xl border-2 border-slate-700/80 overflow-hidden shadow-xl flex flex-col items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                  />

                  {/* 1:1 Square Alignment Overlay */}
                  <div className="absolute w-[80%] h-[80%] border-2 border-cyan-400/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <div className="grid grid-cols-4 grid-rows-4 w-full h-full opacity-60">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="border border-white/40" />
                      ))}
                    </div>
                  </div>

                  {/* Camera Top Controls */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                    <span className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
                      Live Viewfinder
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const next = cameraFacing === 'environment' ? 'user' : 'environment';
                        setCameraFacing(next);
                        startCamera(next);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700"
                      title="Switch Camera"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Shutter Button */}
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center pointer-events-auto">
                    <button
                      id="ai-shutter-snap-btn"
                      type="button"
                      onClick={handleSnapPhoto}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/40 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Face Photo ({photos.length}/6)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center flex flex-col items-center gap-3">
                  <Camera className="w-10 h-10 text-slate-600" />
                  <p className="text-xs text-slate-400 max-w-xs">{cameraError || 'Camera inactive.'}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(cameraFacing)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>

            {/* Photo Gallery & Upload Drop Area */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Collected Photos ({photos.length} captured)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Images</span>
                  </button>

                  {photos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotos([]);
                        setDetectedState(null);
                        setAiSummary(null);
                      }}
                      className="p-1.5 rounded-xl text-red-400 hover:bg-red-950/40 transition-colors"
                      title="Clear all photos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Photo Thumbnails Grid */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 min-h-[160px] max-h-[260px] overflow-y-auto">
                {photos.length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-2">
                    <Layers className="w-8 h-8 opacity-40" />
                    <p className="text-xs">No photos yet. Click "Snap Face Photo" or upload 6 photos to let AI solve it!</p>
                  </div>
                ) : (
                  photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl bg-slate-900 border border-slate-700 overflow-hidden group shadow-md"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Face ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Photo Index Badge */}
                      <span className="absolute top-1.5 left-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white">
                        #{idx + 1}
                      </span>

                      {/* AI Face Assignment Badge (after scan) */}
                      {photo.assignedFace && (
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-cyan-950/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-extrabold text-cyan-300 border border-cyan-500/40 text-center flex items-center justify-center gap-1">
                          <span>Face {photo.assignedFace}</span>
                          {photo.rotationDeg !== undefined && photo.rotationDeg !== 0 && (
                            <span className="text-cyan-400">↻{photo.rotationDeg}°</span>
                          )}
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Action: Run AI Scan */}
              <button
                id="run-ai-omni-scan-btn"
                type="button"
                onClick={handleRunAiOmniScan}
                disabled={photos.length === 0 || isScanning}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                    <span>AI Reasoning &amp; Aligning 3D Cube...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>AI Auto-Detect &amp; Align 3D Model ({photos.length} Photos)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Result Review & Summary Area */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {detectedState && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-cyan-500/50 shadow-2xl flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-black text-white">
                    3D Cube Reconstructed by AI
                  </h3>
                </div>

                <button
                  id="confirm-ai-scan-solve-btn"
                  type="button"
                  onClick={handleConfirmAndSolve}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Load into 3D Solver</span>
                </button>
              </div>

              {/* AI Summary Quote */}
              {aiSummary && (
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 leading-relaxed">
                  <strong className="text-cyan-100 font-bold block mb-1">🤖 AI Topology Insight:</strong>
                  {aiSummary}
                </div>
              )}

              {/* 6-Face Mini Preview Net */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {FACE_NAMES.map((f) => {
                  const stickers = detectedState[f];
                  return (
                    <div key={f} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-300">Face {f}</span>
                      <div className="grid grid-cols-4 grid-rows-4 gap-0.5 w-16 h-16 p-0.5 bg-slate-950 rounded border border-slate-700">
                        {stickers.map((s, idx) => (
                          <div
                            key={idx}
                            className="rounded-[1px]"
                            style={{ backgroundColor: CUBE_COLORS[s.color]?.hex || '#fff' }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Color Conservation Tracker */}
              {colorCounts && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-slate-400">Parity Conservation:</span>
                  <div className="flex items-center gap-3">
                    {Object.entries(colorCounts).map(([color, count]) => (
                      <span key={color} className="flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: CUBE_COLORS[color as CubeColor]?.hex }}
                        />
                        <span className={`font-mono ${count === 16 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {count}/16
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
