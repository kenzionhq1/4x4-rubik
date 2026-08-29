/**
 * CubeNet.tsx
 * Interactive 2D Flat Net cross layout (U on top, L-F-R-B in middle row, D on bottom)
 * for editing 4x4 stickers, cycling colors, showing uncertainty warnings,
 * live color checksum counters (16/16 each), and photo upload slots.
 */

import React, { useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, Sparkles, RefreshCcw, Paintbrush, RotateCw, Play, Wrench } from 'lucide-react';
import { CubeColor, CubeState, FaceName, CUBE_COLORS, COLOR_CYCLE, FACE_METADATA, FACE_NAMES, ValidationStatus } from '../types';

interface CubeNetProps {
  cubeState: CubeState;
  validation: ValidationStatus;
  onStickerClick: (face: FaceName, index: number, targetColor?: CubeColor) => void;
  onFacePhotoUpload: (face: FaceName, file: File) => void;
  onOpenPerspectiveCropper: (face: FaceName) => void;
  onOpenLiveCamera?: (face: FaceName) => void;
  onOpen3DScanModal?: () => void;
  hasPhotoForFace: (face: FaceName) => boolean;
  onLoadDemoScramble: () => void;
  onResetSolved: () => void;
  onAutoRepair?: () => void;
}

export const CubeNet: React.FC<CubeNetProps> = ({
  cubeState,
  validation,
  onStickerClick,
  onFacePhotoUpload,
  onOpenPerspectiveCropper,
  onOpenLiveCamera,
  onOpen3DScanModal,
  hasPhotoForFace,
  onLoadDemoScramble,
  onResetSolved,
  onAutoRepair,
}) => {
  const [selectedPaintColor, setSelectedPaintColor] = useState<CubeColor | null>(null);

  const handleFileUploadChange = (face: FaceName, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFacePhotoUpload(face, e.target.files[0]);
      e.target.value = ''; // allow re-upload
    }
  };

  const handleStickerTap = (face: FaceName, index: number) => {
    if (selectedPaintColor) {
      onStickerClick(face, index, selectedPaintColor);
    } else {
      onStickerClick(face, index);
    }
  };

  // Find first unscanned face or start with 'U' for guided scanning
  const handleStartGuidedScan = () => {
    const firstUnscanned = FACE_NAMES.find((f) => !hasPhotoForFace(f)) || 'U';
    if (onOpenLiveCamera) {
      onOpenLiveCamera(firstUnscanned);
    }
  };

  // Render a single 4x4 face card
  const renderFace = (face: FaceName) => {
    const meta = FACE_METADATA[face];
    const stickers = cubeState[face];
    const uncertainInFace = validation.faceUncertainCounts[face] || 0;
    const hasPhoto = hasPhotoForFace(face);
    const defaultColorDef = CUBE_COLORS[meta.defaultColor];

    return (
      <div
        id={`net-face-${face}`}
        className="flex flex-col items-center bg-slate-900/90 border border-slate-800 p-2 sm:p-3 rounded-2xl shadow-md transition-all hover:border-slate-700"
      >
        {/* Face Title & Capture buttons */}
        <div className="w-full flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 border"
              style={{
                backgroundColor: defaultColorDef.hex + '22',
                color: defaultColorDef.hex === '#ffffff' ? '#94a3b8' : defaultColorDef.hex,
                borderColor: defaultColorDef.hex + '55',
              }}
            >
              {face}
            </span>
            <span className="text-xs font-bold text-slate-200 truncate" title={meta.label}>
              {meta.label}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Perspective align if photo exists */}
            {hasPhoto && (
              <button
                id={`align-crop-${face}`}
                type="button"
                onClick={() => onOpenPerspectiveCropper(face)}
                className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                title="Re-align perspective corners"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Live In-App Camera / File Picker Modal Launcher */}
            <button
              type="button"
              id={`live-cam-btn-${face}`}
              onClick={() => {
                if (onOpenLiveCamera) {
                  onOpenLiveCamera(face);
                }
              }}
              className={`p-1 sm:px-2 sm:py-1 rounded-lg transition-all flex items-center gap-1 text-xs font-bold ${
                hasPhoto
                  ? 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30'
                  : 'text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/60'
              }`}
              title={`Snap or rescan photo for ${FACE_METADATA[face].label} face`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="text-[10px]">{hasPhoto ? 'Rescan' : 'Scan'}</span>
            </button>
          </div>
        </div>

        {/* 4x4 Sticker Grid */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80 w-full max-w-[150px] aspect-square">
          {stickers.map((st, idx) => {
            const colorDef = CUBE_COLORS[st.color];
            const isCenter = [5, 6, 9, 10].includes(idx);

            return (
              <button
                key={idx}
                id={`sticker-${face}-${idx}`}
                onClick={() => handleStickerTap(face, idx)}
                type="button"
                className={`relative rounded-md transition-all flex items-center justify-center font-bold text-[10px] aspect-square ${
                  colorDef.bgClass
                } ${
                  st.uncertain
                    ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-slate-950 border border-dashed border-red-500 animate-pulse'
                    : 'border border-black/20 hover:scale-105 active:scale-95'
                } ${isCenter ? 'after:content-["•"] after:text-[8px] after:opacity-40' : ''}`}
                title={`Sticker (${face}, ${idx}) - Color: ${colorDef.name}${
                  st.uncertain ? ' (Uncertain)' : ''
                }. Click to cycle/paint.`}
              >
                {/* Visual tiny indicator on center pieces */}
              </button>
            );
          })}
        </div>

        {/* Uncertainty indicator under face */}
        {uncertainInFace > 0 && (
          <div className="mt-1 text-[10px] text-amber-400 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {uncertainInFace} uncertain
          </div>
        )}
      </div>
    );
  };

  const totalScannedCount = FACE_NAMES.filter((f) => hasPhotoForFace(f)).length;

  return (
    <div id="cube-net-container" className="flex flex-col gap-5">
      {/* 6-Face Camera Scanning Station & Checklist */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              <Camera className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              6-Face Scanner Station ({totalScannedCount}/6 Scanned)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpen3DScanModal && (
              <button
                id="open-3d-ai-scan-btn"
                type="button"
                onClick={onOpen3DScanModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl shadow-md shadow-cyan-500/20 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>3D Video &amp; AI Cube Scan</span>
              </button>
            )}

            <button
              id="guided-scan-all-btn"
              type="button"
              onClick={handleStartGuidedScan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              <Play className="w-3 h-3 fill-slate-300" />
              <span>{totalScannedCount === 6 ? 'Rescan Face' : 'Single Face'}</span>
            </button>
          </div>
        </div>

        {/* 6 Face Quick Scanning Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {FACE_NAMES.map((f) => {
            const hasPhoto = hasPhotoForFace(f);
            const meta = FACE_METADATA[f];
            const colorDef = CUBE_COLORS[meta.defaultColor];

            return (
              <div
                key={f}
                id={`face-scan-card-${f}`}
                className={`flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all ${
                  hasPhoto
                    ? 'bg-slate-950/80 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/40 inline-block"
                      style={{ backgroundColor: colorDef.hex }}
                    />
                    <span className="text-xs font-black text-white">{f}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      hasPhoto
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {hasPhoto ? 'Scanned' : 'Pending'}
                  </span>
                </div>

                <span className="text-[11px] text-slate-300 font-semibold truncate">
                  {meta.label}
                </span>

                <span className="text-[9px] text-blue-300 bg-blue-950/70 border border-blue-800/40 rounded px-1.5 py-0.5 truncate">
                  {meta.topFaceRef}
                </span>

                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    type="button"
                    id={`quick-scan-btn-${f}`}
                    onClick={() => {
                      if (onOpenLiveCamera) onOpenLiveCamera(f);
                    }}
                    className={`w-full py-1 px-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      hasPhoto
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                    title={hasPhoto ? `Rescan photo for ${meta.label}` : `Scan photo for ${meta.label}`}
                  >
                    <Camera className="w-3 h-3" />
                    <span>{hasPhoto ? 'Rescan' : 'Scan'}</span>
                  </button>

                  {hasPhoto && (
                    <button
                      type="button"
                      id={`quick-align-btn-${f}`}
                      onClick={() => onOpenPerspectiveCropper(f)}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 border border-slate-800 transition-colors"
                      title="Adjust perspective alignment"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Color Checksum and Tools Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Color Checksum Counters */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Color Checksum (Exact 16 required):
            </span>
            {validation.isValid ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> All 96 Valid
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> Balance Required
                </span>
                {onAutoRepair && (
                  <button
                    type="button"
                    onClick={onAutoRepair}
                    className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-md flex items-center gap-1"
                    title="Automatically adjust sticker color counts into a mathematically legal 4x4 cube"
                  >
                    <Wrench className="w-3 h-3" />
                    Auto-Fix Colors
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {COLOR_CYCLE.map((c) => {
              const count = validation.colorCounts[c] || 0;
              const isComplete = count === 16;
              const colorDef = CUBE_COLORS[c];

              return (
                <div
                  key={c}
                  id={`color-count-${c}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    isComplete
                      ? 'bg-slate-950 border-emerald-500/40 text-slate-200'
                      : 'bg-slate-950 border-red-500/50 text-red-400 shadow-sm'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/30 shadow-inner inline-block"
                    style={{ backgroundColor: colorDef.hex }}
                  />
                  <span>{colorDef.name.slice(0, 3)}:</span>
                  <span className={`font-mono font-black ${isComplete ? 'text-emerald-400' : 'text-red-400'}`}>
                    {count}/16
                  </span>
                  {isComplete && <span className="text-[10px] text-emerald-400">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Palette Tool & Quick Demos */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Paint Mode Palette */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 px-1 font-medium" title="Paintbrush mode">
              <Paintbrush className="w-3 h-3 text-blue-400" /> Paint:
            </span>
            <button
              onClick={() => setSelectedPaintColor(null)}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-colors ${
                selectedPaintColor === null
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cycle
            </button>
            {COLOR_CYCLE.map((c) => (
              <button
                key={c}
                id={`paint-color-${c}`}
                onClick={() => setSelectedPaintColor(c)}
                className={`w-6 h-6 rounded-lg transition-transform flex items-center justify-center ${
                  selectedPaintColor === c ? 'ring-2 ring-blue-500 scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: CUBE_COLORS[c].hex }}
                title={`Paint ${CUBE_COLORS[c].name}`}
              >
                {selectedPaintColor === c && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block" />
                )}
              </button>
            ))}
          </div>

          {/* Demo Actions */}
          <div className="flex items-center gap-1.5">
            <button
              id="demo-scramble-btn"
              onClick={onLoadDemoScramble}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/60 rounded-xl transition-colors"
              title="Load standard test scramble"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Demo Scramble
            </button>
            <button
              id="reset-solved-btn"
              onClick={onResetSolved}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
              title="Reset all stickers to pristine solved state"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Reset Solved
            </button>
          </div>
        </div>
      </div>

      {/* Validation Warnings List if any */}
      {validation.errors.length > 0 && (
        <div id="validation-alert-box" className="p-4 bg-slate-900 border-2 border-amber-500/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-white">Sticker Scanning Notice:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
          {onAutoRepair && (
            <button
              type="button"
              onClick={onAutoRepair}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-lg shrink-0 flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              Auto-Repair Colors (1-Click)
            </button>
          )}
        </div>
      )}

      {/* 2D Net Cross Layout */}
      {/*
               [ U ]
          [ L ][ F ][ R ][ B ]
               [ D ]
      */}
      <div className="w-full flex flex-col items-center justify-center p-2 sm:p-6 bg-slate-950/40 border border-slate-800/60 rounded-3xl overflow-x-auto">
        <div className="flex flex-col items-center gap-3 min-w-[340px] sm:min-w-[580px]">
          {/* Top Row: U */}
          <div className="flex justify-center w-full">
            {renderFace('U')}
          </div>

          {/* Middle Row: L, F, R, B */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-2xl">
            {renderFace('L')}
            {renderFace('F')}
            {renderFace('R')}
            {renderFace('B')}
          </div>

          {/* Bottom Row: D */}
          <div className="flex justify-center w-full">
            {renderFace('D')}
          </div>
        </div>
      </div>
    </div>
  );
};
