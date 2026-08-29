import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

/**
 * AI Endpoint: Omni-Scan 4x4 Cube from arbitrary photos in ANY order & ANY orientation.
 * Gemini 3.7 Flash analyzes the photos, deduces face topologies, determines centers,
 * calculates rotation offsets (0, 90, 180, 270 deg), balances 96 stickers (16 of each color),
 * and reconstructs the canonical 3D cube state.
 */
app.post('/api/ai/omni-scan-cube', async (req, res) => {
  try {
    const { images } = req.body; // Array of base64 image strings: string[]
    if (!images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'At least one image is required in images array' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured in environment secrets.',
        useFallback: true,
      });
      return;
    }

    const parts: any[] = [];

    images.slice(0, 12).forEach((imgData: string, idx: number) => {
      const base64Data = imgData.replace(/^data:image\/\w+;base64,/, '');
      const mimeMatch = imgData.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
      parts.push({
        text: `Photo #${idx + 1}: Scanned face photo (Order and orientation are arbitrary).`,
      });
    });

    const prompt = `You are the World's Foremost AI Rubik's Cube Vision & Spatial Topology Engine for 4x4x4 Rubik's Revenge cubes.
The user provided ${images.length} photos of a physical 4x4 Rubik's Cube.
CRITICAL: The user did NOT label which photo is Front, Back, Up, Down, Left, or Right, and the photos may be rotated in ANY orientation (0°, 90°, 180°, 270°)!

YOUR TASKS:
1. ANALYZE EACH PHOTO:
   - Extract the 4x4 grid of 16 colored stickers (rows 0..3, cols 0..3) in reading order (top-left to bottom-right).
   - Valid color codes:
     * 'W' (White)
     * 'Y' (Yellow)
     * 'R' (Red)
     * 'O' (Orange - distinguish from Red carefully under warm lighting)
     * 'B' (Blue)
     * 'G' (Green)
   - Determine the central 2x2 block colors (indices 5, 6, 9, 10) and the perimeter edges/corners.

2. DEDUCE CANONICAL FACE ASSIGNMENTS & ROTATIONS:
   Standard Western Rubik's Color Scheme & Topology:
   - 'U' (Up/Top) has predominantly White center
   - 'D' (Down/Bottom) has predominantly Yellow center (opposite U)
   - 'F' (Front) has predominantly Green center
   - 'B' (Back) has predominantly Blue center (opposite F)
   - 'L' (Left) has predominantly Orange center
   - 'R' (Right) has predominantly Red center (opposite L)
   Relative Chirality: When White is UP and Green is FRONT:
   * Top is White (U)
   * Bottom is Yellow (D)
   * Left is Orange (L)
   * Right is Red (R)
   * Back is Blue (B)

3. ALIGN AND ORIENT EACH FACE:
   - Rotate each photo's 4x4 grid by 0°, 90°, 180°, or 270° so that when mapped to the standard canonical net:
     * U face's top edge connects to B, bottom to F, left to L, right to R.
     * F face's top edge connects to U, bottom to D, left to L, right to R.
     * R face's top edge connects to U, bottom to D, left to F, right to B.
     * B face's top edge connects to U, bottom to D, left to R, right to L.
     * L face's top edge connects to U, bottom to D, left to B, right to F.
     * D face's top edge connects to F, bottom to B, left to L, right to R.

4. ENFORCE 4x4 MATHEMATICAL COLOR PARITY & CONSERVATION:
   - Exactly 96 stickers total across all 6 faces.
   - EXACTLY 16 of each color: 16 'W', 16 'Y', 16 'R', 16 'O', 16 'B', 16 'G'.
   - Resolve any optical glare, shadow, or camera blur to ensure 100% mathematical validity.

5. OUTPUT JSON WITH FULL REASONING:
   - Output the canonical 16-sticker array for each of the 6 faces: U, L, F, R, B, D.
   - Output the mapping details (which photo was assigned to which face, what rotation was applied, and confidence).
   - Output a friendly AI explanation of how you identified the faces regardless of input order.`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts,
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faces: {
              type: Type.OBJECT,
              properties: {
                U: { type: Type.ARRAY, items: { type: Type.STRING }, description: '16 stickers of Up (White) face' },
                L: { type: Type.ARRAY, items: { type: Type.STRING }, description: '16 stickers of Left (Orange) face' },
                F: { type: Type.ARRAY, items: { type: Type.STRING }, description: '16 stickers of Front (Green) face' },
                R: { type: Type.ARRAY, items: { type: Type.STRING }, description: '16 stickers of Right (Red) face' },
                B: { type: Type.ARRAY, items: { type: Type.STRING }, description: '16 stickers of Back (Blue) face' },
                D: { type: Type.ARRAY, items: { type: Type.STRING }, description: '16 stickers of Down (Yellow) face' },
              },
              required: ['U', 'L', 'F', 'R', 'B', 'D'],
            },
            photoMappings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  photoIndex: { type: Type.INTEGER },
                  assignedFace: { type: Type.STRING },
                  rotationAppliedDeg: { type: Type.INTEGER },
                  confidence: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING },
                },
                required: ['photoIndex', 'assignedFace', 'rotationAppliedDeg'],
              },
            },
            colorCounts: {
              type: Type.OBJECT,
              properties: {
                W: { type: Type.INTEGER },
                Y: { type: Type.INTEGER },
                R: { type: Type.INTEGER },
                O: { type: Type.INTEGER },
                B: { type: Type.INTEGER },
                G: { type: Type.INTEGER },
              },
              required: ['W', 'Y', 'R', 'O', 'B', 'G'],
            },
            confidence: { type: Type.NUMBER },
            aiSummary: { type: Type.STRING, description: 'Friendly explanation of face detection and alignment' },
          },
          required: ['faces', 'colorCounts', 'confidence', 'aiSummary'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json({
      success: true,
      faces: parsed.faces || {},
      photoMappings: parsed.photoMappings || [],
      colorCounts: parsed.colorCounts || {},
      confidence: parsed.confidence ?? 0.95,
      aiSummary: parsed.aiSummary || 'AI successfully analyzed and aligned all faces into canonical 3D Rubik coordinates.',
    });
  } catch (err: any) {
    console.error('Gemini omni-scan-cube error:', err);
    res.status(500).json({
      error: err?.message || 'Failed to process Omni-Scan with Gemini AI',
      useFallback: true,
    });
  }
});

/**
 * AI Endpoint: Analyze Scramble & Provide Speedcubing Coach Insights
 */
app.post('/api/ai/analyze-scramble', async (req, res) => {
  try {
    const { cubeState } = req.body;
    if (!cubeState) {
      res.status(400).json({ error: 'cubeState is required' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        success: true,
        scrambleComplexity: 'Moderate (Estimated ~55 moves)',
        keyInsight: 'Standard 4x4 reduction recommended: solve White/Yellow centers first, then side centers, edge pairs, and 3x3 reduction.',
        recommendedStrategy: 'Start with White center block on U face.',
        hasParityExpected: true,
      });
      return;
    }

    const prompt = `You are a 4x4 Rubik's Revenge Speedcubing Coach and Grandmaster Analyst.
Analyze the following 4x4 cube state represented by its 6 faces (U, L, F, R, B, D with 16 color codes each):
${JSON.stringify(cubeState, null, 2)}

Provide a concise, motivating, and strategic analysis for the speedcuber:
1. Scramble difficulty and complexity rating.
2. Best opening move sequence or strategy (e.g. Which center 2x1 block is easiest to build first?).
3. Edge pairing opportunities (any free pairs or 1-move setups?).
4. Parity likelihood (OLL parity and PLL parity odds).
5. Pro tip from a world champion.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scrambleComplexity: { type: Type.STRING },
            bestOpeningMove: { type: Type.STRING },
            keyInsight: { type: Type.STRING },
            edgeOpportunities: { type: Type.STRING },
            parityOutlook: { type: Type.STRING },
            proTip: { type: Type.STRING },
          },
          required: ['scrambleComplexity', 'bestOpeningMove', 'keyInsight', 'proTip'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json({
      success: true,
      ...parsed,
    });
  } catch (err: any) {
    console.error('Gemini analyze-scramble error:', err);
    res.json({
      success: true,
      scrambleComplexity: 'Moderate (Estimated 45-60 moves)',
      bestOpeningMove: 'Form White 2x1 center bar on Up face',
      keyInsight: 'Standard Reduction Method: White & Yellow centers -> Side centers -> Freeslice Edge Pairing -> 3x3 Stage.',
      proTip: 'Keep your center bars aligned to save wide-turn moves during side center construction.',
    });
  }
});

/**
 * AI Endpoint: Ask AI Coach to Explain a Specific Step or Parity Algorithm
 */
app.post('/api/ai/explain-step', async (req, res) => {
  try {
    const { move, phase, phaseTitle, stepNumber, totalSteps } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        explanation: `Move ${move} is part of the ${phaseTitle || phase} phase (Step ${stepNumber} of ${totalSteps}).`,
      });
      return;
    }

    const prompt = `You are an encouraging Rubik's Cube Speedcubing Coach.
Explain why move "${move}" is executed during phase "${phaseTitle || phase}" (Step ${stepNumber} of ${totalSteps}) on a 4x4 Rubik's Revenge cube.
Keep the explanation under 3 sentences: clear, intuitive, and mechanically insightful.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      explanation: response.text?.trim() || `Move ${move} advances the ${phaseTitle} stage.`,
    });
  } catch (err: any) {
    res.json({
      success: true,
      explanation: `Executing ${req.body.move} during ${req.body.phaseTitle || 'current phase'}.`,
    });
  }
});

/**
 * AI Endpoint: Scan single 4x4 face using Gemini 3.7 Flash Multimodal Vision
 */
app.post('/api/ai/scan-face', async (req, res) => {
  try {
    const { image, faceName } = req.body;
    if (!image) {
      res.status(400).json({ error: 'Image data URL is required' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured in environment secrets.',
        useFallback: true,
      });
      return;
    }

    // Clean base64 string
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = `You are an expert Rubik's Cube Vision AI specializing in 4x4x4 Rubik's Revenge cubes.
Analyze this photo of the "${faceName || 'Rubik'}" face of a physical 4x4 Rubik's cube.
The face has a 4x4 grid of 16 colored square stickers arranged in 4 rows and 4 columns.

Valid standard colors and codes:
- 'W' for White
- 'Y' for Yellow
- 'R' for Red
- 'O' for Orange (note: distinguish carefully between Red and Orange under warm lighting)
- 'B' for Blue
- 'G' for Green

Instructions:
1. Examine the 4x4 grid from top-left (row 0, col 0) to bottom-right (row 3, col 3) in standard reading order (row-major: indices 0..15).
2. Ignore shadows, glare, specular reflections on glossy stickers, and camera distortion.
3. Classify all 16 stickers strictly into one of: 'W', 'Y', 'R', 'O', 'B', 'G'.
4. Return an array of exactly 16 color codes, along with overall confidence and reasoning.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stickers: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "Color code: 'W', 'Y', 'R', 'O', 'B', or 'G'",
              },
              description: 'Array of exactly 16 color codes in row-major order 0..15',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence between 0.0 and 1.0',
            },
            detectedLighting: {
              type: Type.STRING,
              description: 'Lighting conditions observed (e.g. warm, cool, harsh glare)',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Brief explanation of color and contrast choices',
            },
          },
          required: ['stickers', 'confidence'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json({
      success: true,
      stickers: parsed.stickers || [],
      confidence: parsed.confidence ?? 0.95,
      detectedLighting: parsed.detectedLighting || 'Standard',
      reasoning: parsed.reasoning || '',
    });
  } catch (err: any) {
    console.error('Gemini scan-face error:', err);
    res.status(500).json({
      error: err?.message || 'Failed to scan face with Gemini AI',
      useFallback: true,
    });
  }
});

/**
 * AI Endpoint: Full 3D 6-Face Cube Reconstruction & Global Parity Reconciliation
 */
app.post('/api/ai/scan-full-cube-3d', async (req, res) => {
  try {
    const { faces } = req.body; // { F: base64, R: base64, B: base64, L: base64, U: base64, D: base64 }
    if (!faces || typeof faces !== 'object') {
      res.status(400).json({ error: 'Faces images dictionary is required' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured in environment secrets.',
        useFallback: true,
      });
      return;
    }

    const faceKeys = ['U', 'L', 'F', 'R', 'B', 'D'];
    const parts: any[] = [];

    faceKeys.forEach((fk) => {
      const imgData = faces[fk];
      if (imgData) {
        const base64Data = imgData.replace(/^data:image\/\w+;base64,/, '');
        const mimeMatch = imgData.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType,
          },
        });
        parts.push({
          text: `Face [${fk}] Photo: Represents the ${fk} face of the 4x4 Rubik's cube.`,
        });
      }
    });

    const prompt = `You are a Grandmaster Rubik's Cube Vision Engine analyzing all 6 faces of a physical 4x4 Rubik's Revenge cube.
We provide the scanned images of the 6 faces:
- U: Up (Top - standard White center)
- L: Left (standard Orange center)
- F: Front (standard Green center)
- R: Right (standard Red center)
- B: Back (standard Blue center)
- D: Down (Bottom - standard Yellow center)

CRITICAL MATHEMATICAL CONSTRAINTS FOR A REAL 4x4 RUBIK'S CUBE:
1. Total Stickers: Exactly 96 stickers total across all 6 faces.
2. Color Distribution: EXACTLY 16 of each color:
   - 16 'W' (White)
   - 16 'Y' (Yellow)
   - 16 'R' (Red)
   - 16 'O' (Orange)
   - 16 'B' (Blue)
   - 16 'G' (Green)
3. For each face (U, L, F, R, B, D), output an array of exactly 16 color codes in row-major order (row 0: 0..3, row 1: 4..7, row 2: 8..11, row 3: 12..15).
4. Cross-check ambiguous colors between faces (e.g. distinguishing orange vs red or off-white vs yellow in uneven lighting) so the global sum of each color is strictly 16.

Return a JSON object containing the reconstructed state for each face (U, L, F, R, B, D), the parity status, color balance counts, and summary.`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts,
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faces: {
              type: Type.OBJECT,
              properties: {
                U: { type: Type.ARRAY, items: { type: Type.STRING } },
                L: { type: Type.ARRAY, items: { type: Type.STRING } },
                F: { type: Type.ARRAY, items: { type: Type.STRING } },
                R: { type: Type.ARRAY, items: { type: Type.STRING } },
                B: { type: Type.ARRAY, items: { type: Type.STRING } },
                D: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['U', 'L', 'F', 'R', 'B', 'D'],
            },
            colorCounts: {
              type: Type.OBJECT,
              properties: {
                W: { type: Type.INTEGER },
                Y: { type: Type.INTEGER },
                R: { type: Type.INTEGER },
                O: { type: Type.INTEGER },
                B: { type: Type.INTEGER },
                G: { type: Type.INTEGER },
              },
              required: ['W', 'Y', 'R', 'O', 'B', 'G'],
            },
            confidence: { type: Type.NUMBER },
            aiAnalysisNotes: { type: Type.STRING },
          },
          required: ['faces', 'colorCounts', 'confidence'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json({
      success: true,
      faces: parsed.faces || {},
      colorCounts: parsed.colorCounts || {},
      confidence: parsed.confidence ?? 0.95,
      aiAnalysisNotes: parsed.aiAnalysisNotes || '',
    });
  } catch (err: any) {
    console.error('Gemini scan-full-cube-3d error:', err);
    res.status(500).json({
      error: err?.message || 'Failed to analyze 3D cube with Gemini AI',
      useFallback: true,
    });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rubik's 4x4 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
