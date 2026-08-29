/**
 * LiveCameraModal.tsx
 * In-App WebRTC Camera Viewfinder for capturing cube faces directly
 * without leaving the browser or launching external camera apps that might cause memory reloads.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, AlertCircle, Camera } from 'lucide-react';
import { FaceName, FACE_METADATA } from '../types';

interface LiveCameraModalProps {
  face: FaceName;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  onSwitchToUpload: () => void;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  face,
  onCapture,
  onClose,
  onSwitchToUpload,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const [hasCameraError, setHasCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isStarting, setIsStarting] = useState(true);

  const startCamera = async (mode: 'environment' | 'user') => {
    if (!isMountedRef.current) return;
    setIsStarting(true);
    setHasCameraError(null);

    // Stop previous stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && isMountedRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                if (err.name !== 'AbortError') {
                  console.warn('LiveCamera play warning:', err);
                }
              });
            }
          }
        };
      }
      setIsStarting(false);
    } catch (err: any) {
      console.warn('Camera error:', err);
      if (isMountedRef.current) {
        setHasCameraError(
          err.message || 'Camera permission denied or camera not accessible. You can upload an image file instead.'
        );
        setIsStarting(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCamera(facingMode);

    return () => {
      isMountedRef.current = false;
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        try {
          videoRef.current.pause();
        } catch {
          // Ignore
        }
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Single snapshot capture
  const handleTakeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 800;
    const height = video.videoHeight || 800;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Stop stream and send capture
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      try {
        videoRef.current.pause();
      } catch {
        // Ignore
      }
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    onCapture(dataUrl);
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div id="live-camera-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Face {face}
            </span>
            <span className="text-sm font-bold text-white">
              Scan {FACE_METADATA[face].label}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orientation & Reference Banner */}
        <div className="bg-blue-950/70 border-b border-blue-800/40 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-200 font-medium">{FACE_METADATA[face].holdInstruction}</span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-900/90 text-blue-200 border border-blue-700/50 whitespace-nowrap ml-2">
            {FACE_METADATA[face].topFaceRef}
          </span>
        </div>

        {/* Viewfinder Frame */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          {hasCameraError ? (
            <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-slate-300 max-w-xs">{hasCameraError}</p>
              <button
                type="button"
                onClick={onSwitchToUpload}
                className="mt-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg transition-colors"
              >
                Choose Photo from Device
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder 4x4 Grid Guide Overlay with Top Edge Tag */}
              <div className="absolute inset-8 border-2 border-blue-400/80 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex flex-col justify-between">
                {/* Top Reference Ribbon */}
                <div className="bg-blue-600/85 text-white text-[10px] font-bold text-center py-0.5 rounded-t-xl border-b border-blue-400/50">
                  ▲ {FACE_METADATA[face].topFaceRef} ▲
                </div>

                <div className="grid grid-cols-4 grid-rows-4 w-full h-full opacity-60">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="border border-white/40" />
                  ))}
                </div>
              </div>

              {/* Target helper text */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm px-3.5 py-1 rounded-full text-[11px] font-semibold text-slate-200 border border-slate-700 pointer-events-none shadow-md">
                Align 4x4 face squarely inside the box
              </div>
            </>
          )}
        </div>

        {/* Shutter & Controls Footer */}
        {!hasCameraError && (
          <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Flip Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleTakeSnapshot}
              disabled={isStarting}
              className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 active:scale-95 border-4 border-blue-500 shadow-xl shadow-blue-500/30 flex items-center justify-center transition-transform"
              title="Capture Face"
            >
              <div className="w-11 h-11 rounded-full bg-blue-600" />
            </button>

            <button
              type="button"
              onClick={onSwitchToUpload}
              className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors max-w-[80px] text-right"
            >
              Upload File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

