import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { generateAiPlan } from './aiPlanner';
import { identifyFromPhoto } from './aiPhoto';
import { generateRegionalFoods } from './regionalFoods';
import { parseVoiceCommand } from './aiVoice';
import { searchRecipes, getRecipeInformation } from './spoonacular';
import type { AiPlanInput, AiPlanProfile } from './types';
import type { MacroTargets } from '../src/types/nutrition';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

const app = express();
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});


app.get('/api/spoonacular/recipe/:id/information', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid recipe id' });
      return;
    }
    const info = await getRecipeInformation(id);
    res.json(info);
  } catch (error) {
    console.error('[spooncular/recipe] failed:', error);
    res.status(500).json({ error: 'Recipe information failed' });
  }
});
app.post('/api/ai/voice', async (req: Request, res: Response) => {
  try {
    const { text, profile, targets } = req.body as {
      text: string;
      profile: AiPlanProfile;
      targets: MacroTargets;
    };
    const action = await parseVoiceCommand(text, { profile, targets });
    res.json(action);
  } catch (error) {
    console.error('[ai/voice] failed:', error);
    res.status(500).json({ error: 'Voice parse failed' });
  }
});

app.post('/api/ai/identify', async (req: Request, res: Response) => {
  try {
    const { image } = req.body as { image: string };
    const result = await identifyFromPhoto(image);
    res.json(result);
  } catch (error) {
    console.error('[ai/identify] failed:', error);
    res.status(500).json({ error: 'Photo identify failed' });
  }
});

app.post('/api/ai/plan', async (req: Request, res: Response) => {
  try {
    const plan = await generateAiPlan(req.body as AiPlanInput);
    res.json(plan);
  } catch (error) {
    console.error('[ai/plan] failed:', error);
    res.status(500).json({ error: 'AI plan generation failed' });
  }
});

app.get('/api/spoonacular/search', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : '';
    const number = Number(req.query.number);
    res.json(
      await searchRecipes({
        query,
        number: Number.isFinite(number) && number > 0 ? number : 20,
      })
    );
  } catch (error) {
    console.error('[spoonacular/search] failed:', error);
    res.status(500).json({ error: 'Spoonacular search failed' });
  }
});

app.get('/api/regional-foods/:regionId', async (req: Request, res: Response) => {
  try {
    const foods = await generateRegionalFoods(String(req.params.regionId));
    res.json(foods);
  } catch (error) {
    console.error('[regional-foods] failed:', error);
    res.status(500).json({ error: 'Regional foods failed' });
  }
});

// Production single-origin: the server also serves the built frontend.
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req: Request, res: Response) => {
    if (req.method === 'GET') res.sendFile(path.join(distDir, 'index.html'));
    else res.status(404).end();
  });
}

const port = Number(process.env.PORT) || 3001;
process.title = 'hydraPrepServer';
app.listen(port, () => console.log(`HydraPrep server listening on http://localhost:${port}`));
