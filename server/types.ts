import type {
  ActivityLevel,
  DietPreference,
  GoalMode,
  LocationId,
  MacroTargets,
  MealSlot,
} from '../src/types/nutrition';

export interface AiPlanProfile {
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: GoalMode;
  locationId: LocationId;
  diet?: DietPreference;
}

export interface AiPlanInput {
  profile: AiPlanProfile;
  targets: MacroTargets;
}

export interface AiPlanPayload {
  plan: Record<string, Partial<Record<MealSlot, string>>>;
  notes?: string[];
}
