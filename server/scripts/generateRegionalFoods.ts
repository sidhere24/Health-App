import { generateRegionalFoods, REGION_FOOD_QUERIES } from '../regionalFoods';
import type { WholeFood } from '../../src/types/nutrition';
import { mkdirSync, writeFileSync } from 'node:fs';

const out: Record<string, WholeFood[]> = {};
for (const regionId of Object.keys(REGION_FOOD_QUERIES)) {
  const foods = await generateRegionalFoods(regionId);
  console.log(`[generateRegionalFoods] ${regionId}: ${foods.length} foods`);
  out[regionId] = foods;
}

mkdirSync('src/data', { recursive: true });
writeFileSync(
  'src/data/regionalFoods.ts',
  `import type { WholeFood } from '../types/nutrition';\n\nexport const REGIONAL_FOODS: Record<string, WholeFood[]> = ${JSON.stringify(out, null, 2)};\n`
);
console.log('Wrote src/data/regionalFoods.ts');
