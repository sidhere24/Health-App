import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { normalizeAiLocalMealPlan, validateLocalPlanRequest } from './src/utils/aiMealPlan';
import { normalizeLabAiReport, validateLabInsightRequest } from './src/utils/labInsights';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
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

const LOCAL_MEAL_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    locationName: {
      type: Type.STRING,
      description: 'Clean normalized city/region name (e.g., "Kochi, Kerala" or "Austin, Texas").',
    },
    regionalOverview: {
      type: Type.STRING,
      description:
        '2 concise sentences describing local markets, seasonal produce, and budget protein strategy for this specific area.',
    },
    localFoods: {
      type: Type.ARRAY,
      description: '12 to 16 whole foods genuinely available in the user location.',
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING, description: 'Short lowercase snake_case identifier.' },
          name: { type: Type.STRING, description: 'Clear English whole-food name.' },
          localName: {
            type: Type.STRING,
            description: 'Regional vernacular or local market name.',
          },
          marketChannel: {
            type: Type.STRING,
            description:
              'One of: "Rythu Bazaar · Produce", "Begum Bazaar · Seeds & Grains", "Local Poultry, Fish & Butcher", "Dairy & Eggs".',
          },
          sourceNote: {
            type: Type.STRING,
            description: 'Where to buy locally in this area and approximate local price range.',
          },
          pricePer100g: {
            type: Type.NUMBER,
            description: 'Realistic local price per 100g edible portion in the user currency.',
          },
          per100g: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              proteinG: { type: Type.NUMBER },
              carbsG: { type: Type.NUMBER },
              fatG: { type: Type.NUMBER },
              fiberG: { type: Type.NUMBER },
              zincMg: { type: Type.NUMBER },
              magnesiumMg: { type: Type.NUMBER },
              seleniumMcg: { type: Type.NUMBER },
              nitratesMg: { type: Type.NUMBER },
            },
            required: [
              'calories',
              'proteinG',
              'carbsG',
              'fatG',
              'fiberG',
              'zincMg',
              'magnesiumMg',
              'seleniumMcg',
              'nitratesMg',
            ],
          },
          primaryPathway: {
            type: Type.STRING,
            description:
              'One of: "Testosterone & Steroidogenesis", "Nitric Oxide & Vascular Flow", "Sperm Quality & Zinc/Selenium", "Cortisol & Stress Recovery".',
          },
          bioactiveMechanism: { type: Type.STRING },
          prepTip: { type: Type.STRING },
        },
        required: [
          'key',
          'name',
          'localName',
          'marketChannel',
          'sourceNote',
          'pricePer100g',
          'per100g',
          'primaryPathway',
          'bioactiveMechanism',
          'prepTip',
        ],
      },
    },
    meals: {
      type: Type.ARRAY,
      description:
        '10 to 12 reusable regional meal templates: at least 2-3 each for breakfast, lunch, snack, and dinner.',
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING, description: 'Short lowercase snake_case meal id.' },
          name: { type: Type.STRING, description: 'Authentic regional whole-food dish name.' },
          slot: {
            type: Type.STRING,
            description: 'One of: "breakfast", "lunch", "snack", "dinner".',
          },
          focusTag: {
            type: Type.STRING,
            description:
              'One of: "Testosterone & Steroidogenesis", "Nitric Oxide & Vascular Flow", "Sperm Quality & Zinc/Selenium", "Cortisol & Stress Recovery".',
          },
          prepTimeMinutes: { type: Type.INTEGER },
          difficulty: {
            type: Type.STRING,
            description:
              'Cooking skill & time rating. One of: "Easy" (quick/minimal steps), "Moderate" (standard pan/pressure-cooker prep), or "Pro" (multi-component or traditional technique).',
          },
          batchFriendly: { type: Type.BOOLEAN },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                foodKey: {
                  type: Type.STRING,
                  description: 'Must match one of the keys defined in localFoods.',
                },
                grams: { type: Type.INTEGER },
                prepNote: { type: Type.STRING },
              },
              required: ['foodKey', 'grams'],
            },
          },
          prepSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 3 concise preparation steps.',
          },
          hormonalBenefit: { type: Type.STRING },
        },
        required: [
          'key',
          'name',
          'slot',
          'focusTag',
          'prepTimeMinutes',
          'difficulty',
          'batchFriendly',
          'ingredients',
          'prepSteps',
          'hormonalBenefit',
        ],
      },
    },
    weekSchedule: {
      type: Type.OBJECT,
      description: 'Maps Mon..Sun to meal keys defined in meals.',
      properties: {
        Mon: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
          },
          required: ['breakfast', 'lunch', 'snack', 'dinner'],
        },
        Tue: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
          },
          required: ['breakfast', 'lunch', 'snack', 'dinner'],
        },
        Wed: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
          },
          required: ['breakfast', 'lunch', 'snack', 'dinner'],
        },
        Thu: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
          },
          required: ['breakfast', 'lunch', 'snack', 'dinner'],
        },
        Fri: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
          },
          required: ['breakfast', 'lunch', 'snack', 'dinner'],
        },
        Sat: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
          },
          required: ['breakfast', 'lunch', 'snack', 'dinner'],
        },
        Sun: {
          type: Type.OBJECT,
          properties: {
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
          },
          required: ['breakfast', 'lunch', 'snack', 'dinner'],
        },
      },
      required: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    batchTasks: {
      type: Type.ARRAY,
      description:
        '4 to 6 actionable batch-prep tasks split between "Sunday Batch (75 min)" and "Wednesday Refresh (45 min)".',
      items: {
        type: Type.OBJECT,
        properties: {
          session: {
            type: Type.STRING,
            description: 'Either "Sunday Batch (75 min)" or "Wednesday Refresh (45 min)".',
          },
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          storageNote: { type: Type.STRING },
        },
        required: ['session', 'title', 'detail', 'storageNote'],
      },
    },
  },
  required: ['locationName', 'regionalOverview', 'localFoods', 'meals', 'weekSchedule', 'batchTasks'],
};

const LAB_INSIGHT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        '2-3 calm, plain-language sentences summarizing educational nutrition takeaways and priorities (never diagnosing disease).',
    },
    extractedMarkers: {
      type: Type.ARRAY,
      description:
        'Biomarkers found in the uploaded image/PDF or pasted text. Leave empty if mode is suggest_tests and no results were provided.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          status: {
            type: Type.STRING,
            description: 'One of: "optimal", "borderline", "attention", "info".',
          },
          note: { type: Type.STRING, description: '1 short educational sentence.' },
        },
        required: ['name', 'value', 'unit', 'status', 'note'],
      },
    },
    priorityFoodFocus: {
      type: Type.ARRAY,
      description: '3 to 5 whole-food nutrition priorities honoring diet, allergens, and local region.',
      items: {
        type: Type.OBJECT,
        properties: {
          foodOrNutrient: { type: Type.STRING },
          whyItHelps: { type: Type.STRING },
          localFoodExamples: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          suggestedMealSlot: {
            type: Type.STRING,
            description: 'One of: "breakfast", "lunch", "snack", "dinner".',
          },
        },
        required: ['foodOrNutrient', 'whyItHelps', 'localFoodExamples', 'suggestedMealSlot'],
      },
    },
    recommendedTests: {
      type: Type.ARRAY,
      description:
        '4 to 7 helpful diagnostic blood/wellness tests to give a clearer picture with a physician.',
      items: {
        type: Type.OBJECT,
        properties: {
          testName: { type: Type.STRING },
          category: { type: Type.STRING },
          whyRecommended: { type: Type.STRING },
          fastingRequired: { type: Type.BOOLEAN },
          priority: {
            type: Type.STRING,
            description: 'One of: "Core", "Targeted", "Optional".',
          },
        },
        required: ['testName', 'category', 'whyRecommended', 'fastingRequired', 'priority'],
      },
    },
    nextWeekAdjustments: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 to 4 concrete meal-prep tweaks to apply to next week.',
    },
    medicalDisclaimer: {
      type: Type.STRING,
    },
  },
  required: [
    'summary',
    'extractedMarkers',
    'priorityFoodFocus',
    'recommendedTests',
    'nextWeekAdjustments',
    'medicalDisclaimer',
  ],
};

async function startServer() {
  const app = express();
  const defaultJsonParser = express.json({ limit: '256kb' });
  app.use((req, res, next) => {
    if (req.path === '/api/ai/lab-insights') {
      return next();
    }
    return defaultJsonParser(req, res, next);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/ai/local-meal-plan', async (req, res) => {
    const validated = validateLocalPlanRequest(req.body);
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }

    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Gemini API key is not configured yet. Please add GEMINI_API_KEY in the Settings > Secrets panel and try again.',
      });
    }

    const input = validated.data;
    const foodsLine =
      input.availableFoods.length > 0
        ? input.availableFoods.join(', ')
        : 'Use the most common, affordable seasonal whole foods, local proteins, leafy greens, grains, and seeds available in this area.';

    const dietRule =
      input.diet === 'vegetarian'
        ? 'STRICT VEGETARIAN: ZERO meat, poultry, fish, seafood, or eggs. Use dairy (paneer/curd/milk), legumes, lentils, soy/tofu, nuts, seeds, and local greens.'
        : input.diet === 'eggetarian'
          ? 'STRICT EGGETARIAN: Eggs and dairy are allowed, ZERO meat, poultry, fish, or seafood.'
          : 'NON-VEG WHOLE FOODS: Include locally caught fish, eggs, poultry, legumes, dairy, greens, and seeds.';

    const allergenLine =
      input.excludedAllergens && input.excludedAllergens.length > 0
        ? `- STRICT ALLERGEN EXCLUSIONS (ZERO tolerance): Do NOT include any ${input.excludedAllergens.join(', ')} ingredients in localFoods or meals.`
        : '';

    const prompt = [
      `Design a practical 7-day whole-food balanced nutrition & hormone-supportive meal prep plan tailored specifically for:`,
      `- User Location: ${input.locationQuery}`,
      `- Locally Available / Preferred Foods in Area: ${foodsLine}`,
      `- Profile & Goal: sex=${input.sex ?? 'neutral'}, ${input.age} yrs, ${input.weightKg} kg, ${input.heightCm} cm, activity=${input.activity}, goal=${input.goal}`,
      `- Diet Requirement: ${dietRule}`,
      allergenLine,
      `- Daily Targets: ~${input.targets.calories} kcal, ${input.targets.proteinG}g protein, ${input.targets.fatG}g healthy fats (hormonal floor >= ${Math.round(input.weightKg * 0.9)}g), ${input.targets.carbsG}g complex carbs, Zinc ${input.targets.zincMg}mg, Magnesium ${input.targets.magnesiumMg}mg, Selenium ${input.targets.seleniumMcg}mcg, Nitrates ${input.targets.nitratesMg}mg`,
      `- Budget Cap: ${input.currencySymbol}${input.dailyBudget}/day (${input.currencyCode}). All pricePer100g values MUST be realistic local market prices in ${input.currencyCode}.`,
      input.kitchenNote ? `- Kitchen / Prep Constraint: ${input.kitchenNote}` : '',
      ``,
      `Requirements:`,
      `1. Build 12-16 authentic local whole foods in localFoods using local market names and realistic ${input.currencyCode} pricePer100g.`,
      `2. Build 10-12 batch-friendly regional meal templates (3 breakfast, 3 lunch, 2-3 pre-training snack, 3 dinner) with a practical mix of "Easy", "Moderate", and "Pro" difficulty ratings (at least one "Easy" option per slot) whose combined daily calories and protein closely hit ~${input.targets.calories} kcal and ~${input.targets.proteinG}g protein across the 4 daily slots.`,
      `3. Every ingredient.foodKey in meals MUST exactly match a key in localFoods, with realistic edible gram weights so daily totals naturally reach the target macros and stay near or under ${input.currencySymbol}${input.dailyBudget}/day.`,
      `4. Map Mon through Sun in weekSchedule using rotating meal keys from meals.`,
      `5. Provide 5-6 specific batchTasks split across "Sunday Batch (75 min)" and "Wednesday Refresh (45 min)" for the regional dishes.`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a clinical sports nutritionist and regional meal-prep specialist. Output strictly valid JSON matching the schema. Use authentic, affordable whole foods genuinely found in the user location, accurate USDA/IFCT per-100g nutrition values, and zero ultra-processed supplements.',
          responseMimeType: 'application/json',
          responseSchema: LOCAL_MEAL_PLAN_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({
          error: 'The AI planner returned an empty response. Please try generating again.',
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return res.status(502).json({
          error: 'The AI planner returned malformed JSON. Please try generating again.',
        });
      }

      const plan = normalizeAiLocalMealPlan(parsed, {
        locationQuery: input.locationQuery,
        availableFoods: input.availableFoods,
      });

      return res.json({ plan });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : 500;

      if (status === 400 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
        return res.status(403).json({
          error:
            'Gemini API key was rejected or is missing permissions. Please verify GEMINI_API_KEY in Settings > Secrets.',
        });
      }
      if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
        return res.status(429).json({
          error:
            'Gemini API rate limit reached. Please wait a moment or check your billing quota in Settings > Secrets.',
        });
      }
      if (status === 404 || /NOT_FOUND/i.test(message)) {
        return res.status(502).json({
          error: `Requested AI model (${MODEL_NAME}) was not found. Please retry or check model configuration.`,
        });
      }

      console.error('[api/ai/local-meal-plan] error:', message);
      return res.status(500).json({
        error: 'Failed to generate your local meal prep plan. Please try again shortly.',
      });
    }
  });

  app.post('/api/ai/lab-insights', express.json({ limit: '6mb' }), async (req, res) => {
    const validated = validateLabInsightRequest(req.body);
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }

    const ai = createGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Gemini API key is not configured yet. Please add GEMINI_API_KEY in the Settings > Secrets panel and try again.',
      });
    }

    const input = validated.data;
    const allergenRule =
      input.profile.excludedAllergens.length > 0
        ? `STRICT ALLERGEN EXCLUSIONS: Never recommend ${input.profile.excludedAllergens.join(', ')}.`
        : 'No declared food allergens.';

    const promptLines = [
      input.mode === 'suggest_tests'
        ? 'The user does NOT have recent lab results yet and wants you to suggest the smartest diagnostic lab tests to get a clearer picture of their nutrition, energy, and metabolic health, PLUS whole-food habits to focus on now.'
        : 'Analyze the submitted lab test results (attached image/PDF and/or pasted values below) from an educational nutrition perspective. Extract key markers, suggest affordable local whole-food adjustments, and recommend any missing follow-up tests that would complete the picture.',
      `User Profile: sex=${input.profile.sex}, age=${input.profile.age}, weight=${input.profile.weightKg}kg, height=${input.profile.heightCm}cm, diet=${input.profile.diet}, goal=${input.profile.goal}, region=${input.profile.locationLabel}.`,
      allergenRule,
      input.symptomsOrGoals ? `User Symptoms / Health Focus: ${input.symptomsOrGoals}` : '',
      input.pastedResults ? `Submitted Lab Values:\n${input.pastedResults}` : '',
      'Rules:',
      '1. Never diagnose diseases or prescribe medications/supplements. Focus strictly on whole-food nutrition and questions/tests to discuss with a doctor.',
      '2. Respect the user diet and allergen exclusions strictly in every food example.',
      '3. Use realistic affordable local whole foods available in the user region.',
    ].filter(Boolean);

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (input.fileAttachment) {
      parts.push({
        inlineData: {
          mimeType: input.fileAttachment.mimeType,
          data: input.fileAttachment.dataBase64,
        },
      });
    }
    parts.push({ text: promptLines.join('\n') });

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts },
        config: {
          systemInstruction:
            'You are a careful, evidence-informed nutrition educator. Output strictly valid JSON matching the schema. Keep tone calm, supportive, non-alarming, and non-diagnostic. Remind users to review results with a licensed clinician.',
          responseMimeType: 'application/json',
          responseSchema: LAB_INSIGHT_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({
          error: 'The AI lab advisor returned an empty response. Please try again.',
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return res.status(502).json({
          error: 'The AI lab advisor returned malformed JSON. Please try again.',
        });
      }

      const report = normalizeLabAiReport(parsed, input.mode);
      return res.json({ report });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : 500;

      if (status === 400 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
        return res.status(403).json({
          error:
            'Gemini API key was rejected or is missing permissions. Please verify GEMINI_API_KEY in Settings > Secrets.',
        });
      }
      if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
        return res.status(429).json({
          error:
            'Gemini API rate limit reached. Please wait a moment or check your billing quota in Settings > Secrets.',
        });
      }
      console.error('[api/ai/lab-insights] error:', message);
      return res.status(500).json({
        error: 'Failed to analyze lab insights right now. Please try again shortly.',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HydraPrep server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start HydraPrep server:', err);
  process.exit(1);
});
