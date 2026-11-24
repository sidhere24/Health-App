import { GoogleGenAI } from '@google/genai';
import { normalizeIdentifyResponse, type PhotoIdentifyResult } from '../src/utils/aiPhoto';

export async function identifyFromPhoto(imageDataUrl: string): Promise<PhotoIdentifyResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const ai = new GoogleGenAI({ apiKey });

  const [header, base64] = imageDataUrl.split(',');
  const mime = (header ?? '').replace('data:', '').replace(';base64', '').trim() || 'image/jpeg';

  const prompt = `Analyze this photo of a meal/plate. Return ONLY a JSON object:
{"foods":[{"name":"<ingredient name>","grams":<estimated grams>}], "note":"<one short line describing the plate>"}
Rules:
- List the main food items (protein, carbs, veggies) with estimated gram weights.
- Keep to the 10 most prominent items, grams should be reasonable estimates.
- Return only the JSON object, no markdown.`;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mime, data: base64 ?? '' } },
          { text: prompt },
        ],
      },
    ],
    config: { responseMimeType: 'application/json', temperature: 0.4 },
  });

  return normalizeIdentifyResponse(result.text ?? '');
}
