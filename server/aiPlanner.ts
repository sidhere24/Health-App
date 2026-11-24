import { GoogleGenAI } from '@google/genai';
import { DAYS_OF_WEEK, MEAL_LIBRARY } from '../src/data/hyderabadMeals';
import { FOODS_BY_ID } from '../src/utils/nutrition';
import type { AiPlanInput, AiPlanPayload } from './types';

function buildAiPlanPrompt(input: AiPlanInput): string {
  const library = MEAL_LIBRARY.map((m) =>
    `${m.id} | slot=${m.slot} | ${m.prepTimeMinutes}min | ${m.hormonalBenefit} | ${m.ingredients
      .map((i) => FOODS_BY_ID[i.foodId]?.name ?? i.foodId)
      .join(', ')}`
  ).join('\n');

  const profile = input.profile;
  const targets = input.targets;

  const planTemplate = DAYS_OF_WEEK.map(
    (day) =>
      `"${day}": {"breakfast": "<mealId>", "lunch": "<mealId>", "snack": "<mealId>", "dinner": "<mealId>"}`
  ).join(',\n');

  return `You are the master meal planner for HydraPrep, a whole-food, hormonal meal planner.

User profile:
- age: ${profile.age}
- weightKg: ${profile.weightKg}
- heightCm: ${profile.heightCm}
- activity: ${profile.activity}
- goal: ${profile.goal}
- location: ${profile.locationId}
- diet: ${profile.diet ?? 'non-veg'}

Daily macro targets:
- calories: ${targets.calories}
- proteinG: ${targets.proteinG}
- carbsG: ${targets.carbsG}
- fatG: ${targets.fatG}
- fiberG: ${targets.fiberG}

Available meals (use these meal IDs; each day must include exactly one breakfast, lunch, snack and dinner):
${library}

Constraints:
- Choose meals that respect the user's hormonal goals, activity level and dietary preferences.
- Aim for daily protein near the target and adequate zinc/magnesium/selenium/nitrates (prefer meals that mention them).
- Include 1-2 meals with short prep time where possible.
- Prefer variety: rotate meals so the same meal is not repeated too much across the week.
- Return ONLY a JSON object:
{
  "plan": {
${planTemplate}
  },
  "notes": ["<one short hint if useful>"]
}
Use only the meal IDs listed above. If unsure, prefer simpler meals.
`;
}

export async function generateAiPlan(input: AiPlanInput): Promise<AiPlanPayload> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: buildAiPlanPrompt(input) }] }],
    config: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 4096 },
  });
  const raw = JSON.parse(result.text ?? '{}');
  return raw as AiPlanPayload;
}
