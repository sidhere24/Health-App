import { GoogleGenAI } from '@google/genai';
import { FOODS_BY_ID, MEALS_BY_ID } from '../src/utils/nutrition';
import { normalizeVoiceResponse, type VoiceAction } from '../src/utils/aiVoice';
import type { AiPlanInput } from './types';

export async function parseVoiceCommand(text: string, input: AiPlanInput): Promise<VoiceAction> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const library = Object.values(MEALS_BY_ID);
  const libraryText = library
    .map((m) =>
      `${m.id} | slot=${m.slot} | ${m.name} | ${m.hormonalBenefit} | ${m.ingredients.map((i) => FOODS_BY_ID[i.foodId]?.name ?? i.foodId).join(', ')}`
    )
    .join('\n');

  const prompt = `You are a meal logger for HydraPrep, a hormonal meal planner.

The user spoke a short voice command. Parse it.

Context:
- Goal: ${input.profile.goal}, diet: ${input.profile.diet ?? 'non-veg'}, age: ${input.profile.age}, weight: ${input.profile.weightKg}kg
- Available meals (use these IDs):
${libraryText}

User transcript: "${text.trim()}"

Rules:
- If the user ate something ("I ate the oat bowl", "just had chicken rice"), return {"action":"consume","mealId":"<best-matching meal id>","note":"<short summary>"}.
- If they want something in their plan ("add the oat bowl to dinner", "plan X for dinner"), return {"action":"plan","mealId":"<best-matching meal id>","note":"<short summary>"}.
- If no meal matches or they said something else, return {"action":"none"}.
- "mealId" must be one of the IDs listed. If none fits, return {"action":"none"}.
- Return ONLY a JSON object with keys "action", "mealId", "note" (note optional, short).
`;

  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseMimeType: 'application/json', temperature: 0.7 },
  });

  return normalizeVoiceResponse(result.text ?? '', MEALS_BY_ID);
}
