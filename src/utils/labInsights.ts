import type {
  AllergenId,
  BiologicalSex,
  DietPreference,
  GoalMode,
  LabAiInsightReport,
  LabFileAttachment,
  LabFoodFocus,
  LabMarkerInsight,
  LabMarkerStatus,
  LabRecommendedTest,
  LabTestPriority,
  MealSlot,
  UserProfile,
} from '../types/nutrition';

export const ALLOWED_LAB_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

export const MAX_LAB_FILE_BYTES = 4 * 1024 * 1024; // 4 MB decoded ceiling

export interface ValidatedLabInsightRequest {
  mode: 'analyze_results' | 'suggest_tests';
  pastedResults: string;
  symptomsOrGoals: string;
  fileAttachment: LabFileAttachment | null;
  profile: {
    sex: BiologicalSex;
    age: number;
    weightKg: number;
    heightCm: number;
    diet: DietPreference;
    goal: GoalMode;
    locationLabel: string;
    excludedAllergens: AllergenId[];
  };
}

/**
 * Deterministic, sex-, age-, and diet-aware baseline lab panel recommendations
 * so users get immediate clinical-prep guidance even before running Gemini AI.
 */
export function getRecommendedLabPanel(
  profile: Pick<UserProfile, 'sex' | 'age' | 'diet' | 'goal' | 'activity'>,
  focusNote = ''
): LabRecommendedTest[] {
  const sex: BiologicalSex = profile.sex ?? 'neutral';
  const age = profile.age || 32;
  const diet: DietPreference = profile.diet ?? 'non-veg';
  const note = focusNote.toLowerCase();

  const tests: LabRecommendedTest[] = [
    {
      id: 'cbc_iron_ferritin',
      testName: 'Complete Blood Count (CBC) + Serum Ferritin',
      category: 'Energy & Oxygen Transport',
      whyRecommended:
        sex === 'female'
          ? 'Essential baseline for energy, endurance, and iron reserves; detects low ferritin well before hemoglobin drops.'
          : 'Checks red blood cell oxygen delivery and stored iron reserves affecting stamina and recovery.',
      fastingRequired: false,
      priority: 'Core',
    },
    {
      id: 'vitamin_d_25oh',
      testName: 'Vitamin D (25-OH)',
      category: 'Hormones, Immunity & Bone Health',
      whyRecommended:
        'Widespread insufficiency across indoor workers; directly impacts bone strength, immune defense, and endocrine signaling.',
      fastingRequired: false,
      priority: 'Core',
    },
    {
      id: 'vitamin_b12_folate',
      testName: 'Vitamin B12 & Serum Folate',
      category: 'Nerves & Metabolic Energy',
      whyRecommended:
        diet === 'vegetarian'
          ? 'High priority for vegetarian diets to protect energy metabolism, nerve function, and red blood cell production.'
          : 'Verifies cellular energy conversion and methylation efficiency.',
      fastingRequired: false,
      priority: diet === 'vegetarian' ? 'Core' : 'Targeted',
    },
    {
      id: 'hba1c_fasting_glucose',
      testName: 'HbA1c + Fasting Blood Glucose',
      category: 'Metabolic & Blood Sugar Control',
      whyRecommended:
        'Shows 3-month average blood sugar stability so daily carb portions and meal timing can be dialed in accurately.',
      fastingRequired: true,
      priority: 'Core',
    },
    {
      id: 'lipid_profile',
      testName: 'Fasting Lipid Panel (HDL, LDL, Triglycerides)',
      category: 'Cardiovascular & Vascular Health',
      whyRecommended:
        'Evaluates blood lipid balance alongside daily dietary fats, fiber, and omega-3 intake.',
      fastingRequired: true,
      priority: age >= 35 ? 'Core' : 'Targeted',
    },
    {
      id: 'thyroid_tsh',
      testName: 'Thyroid Profile (TSH, Free T3, Free T4)',
      category: 'Metabolic Rate & Recovery',
      whyRecommended:
        sex === 'female' || /fatigue|tired|cold|weight|hair/.test(note)
          ? 'Strongly clarifies metabolic speed, energy dips, hair/skin health, and selenium/iodine needs.'
          : 'Screens baseline metabolic pacing and recovery efficiency.',
      fastingRequired: false,
      priority: sex === 'female' || /fatigue|tired|weight|hair/.test(note) ? 'Core' : 'Targeted',
    },
  ];

  if (sex === 'male') {
    tests.push({
      id: 'male_hormone_zinc',
      testName: 'Morning Total & Free Testosterone + Serum Zinc',
      category: 'Hormonal Vitality & Recovery',
      whyRecommended:
        'Draw between 7–9 AM fasting; connects sleep, healthy fat intake, and dietary zinc directly to vitality.',
      fastingRequired: true,
      priority: age >= 28 ? 'Targeted' : 'Optional',
    });
  } else if (sex === 'female') {
    tests.push({
      id: 'female_calcium_magnesium',
      testName: 'Serum Calcium, Magnesium & Iron Studies (TIBC)',
      category: 'Bone Density & Mineral Balance',
      whyRecommended:
        age >= 45
          ? 'Supports bone density, muscle recovery, and calm sleep through perimenopause and beyond.'
          : 'Ensures mineral reserves keep pace with active training and monthly iron turnover.',
      fastingRequired: false,
      priority: age >= 45 ? 'Core' : 'Targeted',
    });
  } else {
    tests.push({
      id: 'rbc_magnesium_zinc',
      testName: 'Serum Zinc & Magnesium + hs-CRP',
      category: 'Micronutrients & Inflammation',
      whyRecommended:
        'Connects key whole-food minerals and recovery inflammation markers directly to meal composition.',
      fastingRequired: false,
      priority: 'Targeted',
    });
  }

  if (age >= 45 || /heart|bp|pressure|cholesterol/.test(note)) {
    tests.push({
      id: 'apob_hscrp',
      testName: 'ApoB & High-Sensitivity CRP (hs-CRP)',
      category: 'Longevity & Vascular Risk',
      whyRecommended:
        'Provides a sharper view of vascular inflammation and long-term cardiovascular health for adults 45+.',
      fastingRequired: true,
      priority: 'Targeted',
    });
  }

  if (diet === 'vegetarian' || /plant|vegan|hair|nails/.test(note)) {
    tests.push({
      id: 'veg_zinc_protein',
      testName: 'Serum Zinc & Total Protein / Albumin',
      category: 'Plant-Based Nutrient Adequacy',
      whyRecommended:
        'Confirms adequate zinc absorption and total amino acid intake on plant-forward meal plans.',
      fastingRequired: false,
      priority: 'Targeted',
    });
  }

  return tests;
}

export function stripBase64DataPrefix(raw: string): string {
  const trimmed = raw.trim();
  const commaIdx = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && commaIdx !== -1) {
    return trimmed.slice(commaIdx + 1).replace(/\s+/g, '');
  }
  return trimmed.replace(/\s+/g, '');
}

export function estimateBase64Bytes(base64: string): number {
  const clean = stripBase64DataPrefix(base64);
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

export function validateLabInsightRequest(
  rawBody: unknown
): { ok: true; data: ValidatedLabInsightRequest } | { ok: false; error: string } {
  if (!rawBody || typeof rawBody !== 'object') {
    return { ok: false, error: 'Request payload is missing.' };
  }

  const body = rawBody as Record<string, unknown>;
  const mode = body.mode === 'suggest_tests' ? 'suggest_tests' : 'analyze_results';
  const pastedResults = typeof body.pastedResults === 'string' ? body.pastedResults.trim() : '';
  const symptomsOrGoals =
    typeof body.symptomsOrGoals === 'string' ? body.symptomsOrGoals.trim().slice(0, 600) : '';

  if (pastedResults.length > 6000) {
    return {
      ok: false,
      error: 'Pasted lab text is too long. Please keep it under 6,000 characters.',
    };
  }

  let fileAttachment: LabFileAttachment | null = null;
  if (body.fileAttachment && typeof body.fileAttachment === 'object') {
    const rawFile = body.fileAttachment as Record<string, unknown>;
    const mimeType = typeof rawFile.mimeType === 'string' ? rawFile.mimeType.trim().toLowerCase() : '';
    const fileName =
      typeof rawFile.fileName === 'string' ? rawFile.fileName.trim().slice(0, 120) : 'lab-report';
    const rawBase64 = typeof rawFile.dataBase64 === 'string' ? rawFile.dataBase64 : '';

    if (!ALLOWED_LAB_MIME_TYPES.has(mimeType)) {
      return {
        ok: false,
        error: 'Unsupported file format. Please upload a PNG, JPG, WEBP image or a PDF lab report.',
      };
    }

    const cleanBase64 = stripBase64DataPrefix(rawBase64);
    if (!cleanBase64 || !/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
      return { ok: false, error: 'Uploaded file data is invalid or corrupted.' };
    }

    const byteSize = estimateBase64Bytes(cleanBase64);
    if (byteSize <= 0 || byteSize > MAX_LAB_FILE_BYTES) {
      return {
        ok: false,
        error: 'Uploaded file exceeds the 4 MB limit. Please upload a smaller image or PDF.',
      };
    }

    fileAttachment = { fileName, mimeType, dataBase64: cleanBase64 };
  }

  if (mode === 'analyze_results' && !pastedResults && !fileAttachment) {
    return {
      ok: false,
      error: 'Please upload a lab report (image or PDF) or paste your test values to analyze.',
    };
  }

  const rawProfile =
    body.profile && typeof body.profile === 'object'
      ? (body.profile as Record<string, unknown>)
      : {};

  const sex: BiologicalSex =
    rawProfile.sex === 'female' || rawProfile.sex === 'male' || rawProfile.sex === 'neutral'
      ? rawProfile.sex
      : 'neutral';
  const diet: DietPreference =
    rawProfile.diet === 'vegetarian' || rawProfile.diet === 'eggetarian'
      ? rawProfile.diet
      : 'non-veg';
  const goal: GoalMode =
    rawProfile.goal === 'fat-loss' || rawProfile.goal === 'lean-gain' ? rawProfile.goal : 'recomp';
  const age = Math.min(85, Math.max(18, Math.round(Number(rawProfile.age) || 32)));
  const weightKg = Math.min(180, Math.max(38, Math.round(Number(rawProfile.weightKg) || 75)));
  const heightCm = Math.min(220, Math.max(130, Math.round(Number(rawProfile.heightCm) || 172)));
  const locationLabel =
    typeof rawProfile.locationLabel === 'string' && rawProfile.locationLabel.trim()
      ? rawProfile.locationLabel.trim().slice(0, 80)
      : 'Hyderabad, Telangana';

  const validAllergens = new Set<AllergenId>(['dairy', 'eggs', 'nuts', 'fish', 'soy']);
  const excludedAllergens = Array.isArray(rawProfile.excludedAllergens)
    ? rawProfile.excludedAllergens.filter((a): a is AllergenId => validAllergens.has(a as AllergenId))
    : [];

  return {
    ok: true,
    data: {
      mode,
      pastedResults,
      symptomsOrGoals,
      fileAttachment,
      profile: {
        sex,
        age,
        weightKg,
        heightCm,
        diet,
        goal,
        locationLabel,
        excludedAllergens,
      },
    },
  };
}

function normalizeStatus(raw: unknown): LabMarkerStatus {
  if (raw === 'optimal' || raw === 'borderline' || raw === 'attention' || raw === 'info') {
    return raw;
  }
  return 'info';
}

function normalizePriority(raw: unknown): LabTestPriority {
  if (raw === 'Core' || raw === 'Targeted' || raw === 'Optional') {
    return raw;
  }
  return 'Targeted';
}

function normalizeSlot(raw: unknown): MealSlot {
  if (raw === 'breakfast' || raw === 'lunch' || raw === 'snack' || raw === 'dinner') {
    return raw;
  }
  return 'lunch';
}

export function normalizeLabAiReport(
  raw: unknown,
  mode: 'analyze_results' | 'suggest_tests',
  nowIso = new Date().toISOString()
): LabAiInsightReport {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const extractedMarkers: LabMarkerInsight[] = Array.isArray(obj.extractedMarkers)
    ? obj.extractedMarkers
        .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
        .slice(0, 15)
        .map((m) => ({
          name: String(m.name ?? 'Marker').trim(),
          value: String(m.value ?? '—').trim(),
          unit: String(m.unit ?? '').trim(),
          status: normalizeStatus(m.status),
          note: String(m.note ?? '').trim(),
        }))
    : [];

  const priorityFoodFocus: LabFoodFocus[] = Array.isArray(obj.priorityFoodFocus)
    ? obj.priorityFoodFocus
        .filter((f): f is Record<string, unknown> => Boolean(f && typeof f === 'object'))
        .slice(0, 8)
        .map((f) => ({
          foodOrNutrient: String(f.foodOrNutrient ?? 'Whole-Food Focus').trim(),
          whyItHelps: String(f.whyItHelps ?? '').trim(),
          localFoodExamples: Array.isArray(f.localFoodExamples)
            ? f.localFoodExamples.map((x) => String(x).trim()).filter(Boolean).slice(0, 6)
            : [],
          suggestedMealSlot: normalizeSlot(f.suggestedMealSlot),
        }))
    : [];

  const recommendedTests: LabRecommendedTest[] = Array.isArray(obj.recommendedTests)
    ? obj.recommendedTests
        .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
        .slice(0, 10)
        .map((t, idx) => ({
          id: `ai_test_${idx + 1}`,
          testName: String(t.testName ?? 'Recommended Lab Panel').trim(),
          category: String(t.category ?? 'General Wellness').trim(),
          whyRecommended: String(t.whyRecommended ?? '').trim(),
          fastingRequired: Boolean(t.fastingRequired),
          priority: normalizePriority(t.priority),
        }))
    : [];

  const nextWeekAdjustments = Array.isArray(obj.nextWeekAdjustments)
    ? obj.nextWeekAdjustments.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
    : [];

  return {
    id: `lab_${Date.now()}`,
    generatedAt: nowIso,
    mode,
    summary:
      typeof obj.summary === 'string' && obj.summary.trim()
        ? obj.summary.trim()
        : 'Educational nutrition summary generated from your profile and submitted information.',
    extractedMarkers,
    priorityFoodFocus,
    recommendedTests,
    nextWeekAdjustments,
    medicalDisclaimer:
      typeof obj.medicalDisclaimer === 'string' && obj.medicalDisclaimer.trim()
        ? obj.medicalDisclaimer.trim()
        : 'Educational wellness information only — not medical advice, diagnosis, or treatment. Always review lab results and test orders with a licensed physician.',
  };
}

export function formatLabChecklistText(
  tests: LabRecommendedTest[],
  selectedIds: Record<string, boolean>,
  profile: Pick<UserProfile, 'sex' | 'age' | 'diet'>
): string {
  const chosen = tests.filter((t) => selectedIds[t.id]);
  const list = chosen.length > 0 ? chosen : tests;
  const lines = [
    `HydraPrep Diagnostic Lab Checklist (${profile.sex ?? 'neutral'} · ${profile.age} yrs · ${profile.diet ?? 'non-veg'})`,
    'Bring this list to discuss with your physician or diagnostic lab:',
    '',
  ];
  for (const t of list) {
    lines.push(
      `- [ ] ${t.testName} [${t.priority}${t.fastingRequired ? ' · Fasting' : ''}] — ${t.whyRecommended}`
    );
  }
  return lines.join('\n').trim();
}
