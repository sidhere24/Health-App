// Smoke-test the HydraPrep server: boot it, hit /api/health and /api/ai/plan, then stop it.
import { execSync, spawn } from 'node:child_process';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const child = spawn('npx', ['tsx', 'server/index.ts'], { shell: true });
let serverOut = '';
child.stdout.on('data', (d) => (serverOut += d));
child.stderr.on('data', (d) => (serverOut += d));

const ready = async () => {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://localhost:3001/api/health');
      console.log('HEALTH:', res.status, JSON.stringify(await res.json()));
      return true;
    } catch {
      await wait(500);
    }
  }
  console.log('HEALTH CHECK FAILED — server output:\n' + serverOut);
  return false;
};

try {
  const up = await ready();
  if (up) {
    try {
      const res = await fetch('http://localhost:3001/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            age: 32,
            weightKg: 85,
            heightCm: 176,
            activity: 'active',
            goal: 'recomp',
            locationId: 'hyderabad',
            diet: 'non-veg',
          },
          targets: { calories: 2500, proteinG: 170, carbsG: 220, fatG: 90, fiberG: 30 },
        }),
      });
      console.log('AI/PLAN:', res.status, JSON.stringify(await res.json()));
    } catch (e) {
      console.log('AI/PLAN CHECK FAILED:', e.message);
    }
    try {
      const res = await fetch('http://localhost:3001/api/spoonacular/search?query=eggs&number=5');
      const data = await res.json();
      console.log('SPOONACULAR/SEARCH:', res.status, JSON.stringify(data).slice(0, 120));
    } catch (e) {
      console.log('SPOONACULAR/SEARCH FAILED:', e.message);
    }
    try {
      const res = await fetch('http://localhost:3001/api/regional-foods/usa');
      console.log('REGIONAL-FOODS/USA:', res.status, (await res.json()).length);
    } catch (e) {
      console.log('REGIONAL-FOODS/USA FAILED:', e.message);
    }
    try {
      const res = await fetch('http://localhost:3001/api/ai/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'I ate the oat bowl',
          profile: { age: 32, weightKg: 85, heightCm: 176, activity: 'active', goal: 'recomp', locationId: 'hyderabad', diet: 'non-veg' },
          targets: { calories: 2500, proteinG: 170, carbsG: 220, fatG: 90, fiberG: 30 },
        }),
      });
      console.log('AI/VOICE:', res.status, JSON.stringify(await res.json()));
    } catch (e) {
      console.log('AI/VOICE CHECK FAILED:', e.message);
    }
    try {
      const res = await fetch('http://localhost:3001/api/ai/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'data:image/png;base64,AAAA' }),
      });
      console.log('AI/IDENTIFY:', res.status, JSON.stringify(await res.json()));
    } catch (e) {
      console.log('AI/IDENTIFY CHECK FAILED:', e.message);
    }
  }
} finally {
  try {
    execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' });
  } catch {
    // ignore kill errors
  }
  process.exit(0);
}
