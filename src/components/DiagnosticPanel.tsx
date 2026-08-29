import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Code,
  Terminal,
  Grid,
  Layers,
  Sparkles,
  Info,
  XCircle,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { CubeDiagnosticReport } from '../utils/cube4x4Diagnostics';
import { CUBE_COLORS, CubeColor } from '../types';

interface DiagnosticPanelProps {
  report: CubeDiagnosticReport | null;
  isOpen: boolean;
  onToggle: () => void;
  onAutoRepair?: () => void;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  report,
  isOpen,
  onToggle,
  onAutoRepair,
}) => {
  const [activeTab, setActiveTab] = useState<'easy' | 'overview' | 'flat' | 'edges' | 'corners' | 'logs'>('easy');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!report) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const { isMathematicallyValid, parity, cornerAnalysis, edgeAnalysis, colorCounts, centerCounts } = report;

  // Translate technical speedcubing errors into simple plain-English explanations
  const getSimpleExplanation = (error: string) => {
    if (error.includes('Corner Orientation Parity Violation') || error.includes('twisted')) {
      return {
        title: 'Corner Twist Inconsistency',
        explanation:
          'One or more corner pieces was scanned with its colors rotated. On a real physical 4x4 cube, all 8 corners must mathematically sum to 0 twist.',
        action: 'Click "Auto-Repair Scanned Colors" or tap the corner on the 2D Net to align its colors.',
      };
    }
    if (error.includes('Sticker Count Mismatch')) {
      return {
        title: 'Color Count Mismatch',
        explanation:
          'A 4x4 cube must have exactly 16 stickers of each color (16 White, 16 Yellow, 16 Green, 16 Blue, 16 Orange, 16 Red). Camera lighting often makes Orange look Red or White look Yellow.',
        action: 'Click "Auto-Repair Scanned Colors" to automatically rebalance all colors to 16.',
      };
    }
    if (error.includes('Center Count Mismatch')) {
      return {
        title: 'Center Piece Imbalance',
        explanation:
          'Each of the 6 faces has 4 center stickers (24 centers total, 4 per color).',
        action: 'Auto-Repair will restore each face center to its standard Western color arrangement.',
      };
    }
    if (error.includes('Impossible Corner') || error.includes('incompatible colors')) {
      return {
        title: 'Incompatible Corner Piece',
        explanation:
          'A corner piece has opposite face colors together (such as White and Yellow, or Blue and Green), which is physically impossible on a real Rubik\'s cube.',
        action: 'Auto-Repair will correct the corner piece to a legal physical combination.',
      };
    }
    return {
      title: 'Scanned Color Inconsistency',
      explanation: error,
      action: 'Click "Auto-Repair Scanned Colors" to resolve this scanning artifact automatically.',
    };
  };

  return (
    <div
      id="diagnostic-logging-panel"
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isMathematicallyValid
          ? 'bg-slate-900/95 border-slate-700 text-slate-100'
          : 'bg-red-950/90 border-red-800/80 text-red-50'
      }`}
    >
      {/* Header Bar */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-slate-900/60 hover:bg-slate-800/60 border-b border-slate-800"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              isMathematicallyValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-slate-100">
                4x4 State Diagnostics &amp; Parity Verifier
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  isMathematicallyValid
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                }`}
              >
                {isMathematicallyValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mathematically Solvable
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Scanning Artifact Detected
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isMathematicallyValid
                ? 'All 96 stickers and physical parities are valid & ready to solve.'
                : 'Minor lighting or sticker mismatch detected. 1-click Auto-Repair is available below.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAutoRepair && !isMathematicallyValid && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAutoRepair();
              }}
              className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition"
              title="Fix minor scanning errors and make solvable"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Auto-Repair Colors</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(report.flatColorString, 'flatStringHeader');
            }}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition hidden sm:flex"
            title="Copy 96-char flat color string"
          >
            {copiedKey === 'flatStringHeader' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy 96-Array</span>
          </button>

          <button className="p-1.5 text-slate-400 hover:text-slate-200">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-5 space-y-5">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('easy')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'easy'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Easy Fix Guide {report.errors.length > 0 ? `(${report.errors.length})` : ''}
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Parity &amp; Health
            </button>

            <button
              onClick={() => setActiveTab('flat')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'flat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Flat State Array (96)
            </button>

            <button
              onClick={() => setActiveTab('edges')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'edges'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Edge Pairs ({edgeAnalysis.pairedDedges}/12)
            </button>

            <button
              onClick={() => setActiveTab('corners')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'corners'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Corners ({cornerAnalysis.validCount}/8)
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Console Logs
            </button>
          </div>

          {/* TAB: EASY FIX GUIDE */}
          {activeTab === 'easy' && (
            <div className="space-y-4">
              {isMathematicallyValid ? (
                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 text-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-300">Your Cube is 100% Solvable!</h4>
                    <p className="text-xs text-emerald-200/90 mt-1">
                      All 96 stickers have been scanned and verified. Every physical law of the 4x4 Rubik's Revenge is satisfied. Click the <strong>Solve 4x4 Cube</strong> button to calculate your step-by-step solution!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Quick 1-Click Fix Recommended
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Camera reflections or shadows usually cause 1 or 2 stickers to be misidentified. Our smart Auto-Repair will adjust them to the closest physically legal cube state.
                      </p>
                    </div>
                    {onAutoRepair && (
                      <button
                        type="button"
                        onClick={onAutoRepair}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 flex-shrink-0"
                      >
                        <Wrench className="w-4 h-4" />
                        ⚡ Auto-Repair Scanned Colors Now
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Plain-English Breakdown of Detected Issues:
                    </h5>
                    {report.errors.map((err, i) => {
                      const item = getSimpleExplanation(err);
                      return (
                        <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                          <div className="flex items-center gap-2 font-semibold text-amber-300 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            {item.title}
                          </div>
                          <p className="text-xs text-slate-300">{item.explanation}</p>
                          <p className="text-[11px] text-emerald-400 pt-1 font-medium">💡 Fix: {item.action}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color counts distribution */}
              <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
                <span className="text-xs font-semibold text-slate-300 block mb-2.5">
                  Sticker Counts (Should be exactly 16 per color):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['W', 'Y', 'G', 'B', 'O', 'R'] as CubeColor[]).map((c) => {
                    const count = colorCounts[c] || 0;
                    const centerCount = centerCounts[c] || 0;
                    const isTotalValid = count === 16;
                    const isCenterValid = centerCount === 4;

                    return (
                      <div
                        key={c}
                        className={`rounded-lg p-2 text-center border ${
                          isTotalValid && isCenterValid
                            ? 'bg-slate-900 border-slate-700'
                            : 'bg-red-900/40 border-red-600/80'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-500 shadow-sm inline-block"
                            style={{ backgroundColor: CUBE_COLORS[c].hex }}
                          />
                          <span className="text-xs font-bold text-slate-200">{CUBE_COLORS[c].name}</span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Total: <strong className={isTotalValid ? 'text-emerald-400' : 'text-red-400'}>{count}/16</strong>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Center: <span className={isCenterValid ? 'text-slate-300' : 'text-red-400 font-bold'}>{centerCount}/4</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Metric Badges Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80">
                  <span className="text-[11px] text-slate-400 block mb-1">State Solvability</span>
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    {isMathematicallyValid ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Solvable
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Impossible
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {isMathematicallyValid ? 'All physical tests passed' : `${report.errors.length} contradiction(s)`}
                  </span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80">
                  <span className="text-[11px] text-slate-400 block mb-1">Dedge Pairing</span>
                  <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                    <span className={edgeAnalysis.pairedDedges === 12 ? 'text-emerald-400' : 'text-amber-400'}>
                      {edgeAnalysis.pairedDedges} / 12
                    </span>
                    <span className="text-xs font-normal text-slate-400">Paired</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {edgeAnalysis.unpairedDedges} dedges need pairing
                  </span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80">
                  <span className="text-[11px] text-slate-400 block mb-1">4x4 Parity Status</span>
                  <div className="text-xs font-medium text-slate-200 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>OLL Parity:</span>
                      <span className={`font-semibold ${parity.hasOLLParity ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {parity.hasOLLParity ? 'Odd (Required)' : 'Even'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>PLL Parity:</span>
                      <span className={`font-semibold ${parity.hasPLLParity ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {parity.hasPLLParity ? 'Swap' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80">
                  <span className="text-[11px] text-slate-400 block mb-1">Corners &amp; Centers</span>
                  <div className="text-xs font-medium text-slate-200 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>Corner Twist:</span>
                      <span className={`font-semibold ${cornerAnalysis.isOrientationValid ? 'text-emerald-400' : 'text-red-400'}`}>
                        {cornerAnalysis.orientationSum % 3 === 0 ? '0 mod 3 (Valid)' : `${cornerAnalysis.orientationSum % 3} (Twisted!)`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Centers Solved:</span>
                      <span className="text-slate-300 font-semibold">{parity.solvedCenterCount} / 24</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLAT STATE ARRAY */}
          {activeTab === 'flat' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  Flat 96-Sticker Linear String &amp; Array:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(report.flatColorString, 'flatColorString')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 flex items-center gap-1 transition"
                  >
                    {copiedKey === 'flatColorString' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy String
                  </button>
                  <button
                    onClick={() => handleCopy(JSON.stringify(report.flatArray, null, 2), 'flatJson')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 flex items-center gap-1 transition"
                  >
                    {copiedKey === 'flatJson' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                    Copy JSON
                  </button>
                </div>
              </div>

              {/* Raw String */}
              <div className="p-3 bg-slate-950 font-mono text-xs text-amber-300 rounded-xl border border-slate-800 break-all select-all">
                {report.flatColorString}
              </div>

              {/* Indexed Grid by Face */}
              <div className="space-y-3">
                {(['U', 'L', 'F', 'R', 'B', 'D'] as const).map((face) => (
                  <div key={face} className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-800">
                    <span className="text-xs font-semibold text-slate-300 mb-2 block">
                      Face {face} (16 stickers):
                    </span>
                    <div className="grid grid-cols-8 md:grid-cols-16 gap-1.5 font-mono text-[11px]">
                      {report.flatArray
                        .filter((item) => item.startsWith(face))
                        .map((item) => {
                          const [, color] = item.split(':') as [string, CubeColor];
                          return (
                            <div
                              key={item}
                              className="px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center"
                            >
                              <span className="text-[9px] text-slate-400 block">{item.split(':')[0]}</span>
                              <span
                                className="font-bold text-xs"
                                style={{ color: CUBE_COLORS[color]?.hex || '#fff' }}
                              >
                                {color}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DEDGE PAIRING MATRIX */}
          {activeTab === 'edges' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                12 Composite Dedge Slots (2 Wing Edge pieces each):
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="p-2.5">Slot</th>
                      <th className="p-2.5">Wing 1</th>
                      <th className="p-2.5">Wing 2</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                    {report.dedges.map((dedge) => (
                      <tr key={dedge.slot} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold text-slate-200">{dedge.slot}</td>
                        <td className="p-2.5 font-mono">
                          <span
                            className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 font-bold"
                            style={{ color: CUBE_COLORS[dedge.wing1.color1]?.hex }}
                          >
                            {dedge.wing1.color1}
                          </span>
                          -
                          <span
                            className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 font-bold"
                            style={{ color: CUBE_COLORS[dedge.wing1.color2]?.hex }}
                          >
                            {dedge.wing1.color2}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono">
                          <span
                            className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 font-bold"
                            style={{ color: CUBE_COLORS[dedge.wing2.color1]?.hex }}
                          >
                            {dedge.wing2.color1}
                          </span>
                          -
                          <span
                            className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 font-bold"
                            style={{ color: CUBE_COLORS[dedge.wing2.color2]?.hex }}
                          >
                            {dedge.wing2.color2}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {dedge.isPaired ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Paired
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Unpaired</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CORNERS MATRIX */}
          {activeTab === 'corners' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                8 Physical Corner Pieces &amp; Twist Orientations:
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="p-2.5">Position</th>
                      <th className="p-2.5">Colors</th>
                      <th className="p-2.5">Twist (+0/+1/+2)</th>
                      <th className="p-2.5">Validity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                    {report.corners.map((corner) => (
                      <tr key={corner.position} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold text-slate-200">{corner.position}</td>
                        <td className="p-2.5 font-mono">
                          {corner.colors.map((c, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 font-bold mr-1"
                              style={{ color: CUBE_COLORS[c]?.hex }}
                            >
                              {c}
                            </span>
                          ))}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {corner.orientation === 0 ? (
                            <span className="text-emerald-400">Aligned (0)</span>
                          ) : corner.orientation === 1 ? (
                            <span className="text-amber-400">Clockwise (+1)</span>
                          ) : (
                            <span className="text-amber-400">Counter-CW (+2)</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {corner.isValidCombination ? (
                            <span className="text-emerald-400 font-medium">Valid Piece</span>
                          ) : (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Incompatible Colors
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Real-Time Diagnostic Log Stream:</span>
                <button
                  onClick={() => handleCopy(report.consoleLogOutput.join('\n'), 'rawLogs')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 border border-slate-700 transition"
                >
                  {copiedKey === 'rawLogs' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy Raw Log
                </button>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto space-y-1">
                {report.consoleLogOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('INVALID') || line.includes('Violation') || line.includes('Error')
                        ? 'text-red-400'
                        : line.includes('VALID') || line.includes('Solvable')
                        ? 'text-emerald-400'
                        : line.includes('PARITY')
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
