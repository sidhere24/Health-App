import { useMemo, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import type {
  ConsumedState,
  DayOfWeek,
  MacroTargets,
  MealTemplate,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { computeSocialProfileMetrics, formatWhatsAppPlanText, formatWhatsAppStatus } from '../utils/social';
import { MEALS_BY_ID } from '../utils/nutrition';

interface SocialShareBarProps {
  weekPlan: WeekPlan;
  selectedDay: DayOfWeek;
  multipliers: PortionMultipliers;
  consumed: ConsumedState;
  targets: MacroTargets;
  foodsById: Record<string, WholeFood>;
  mealsById?: Record<string, MealTemplate>;
}

/**
 * WhatsApp-style social bar: one-line status + full plan text, both copied to
 * the clipboard. Social metrics are computed client-side from the week plan.
 */
export function SocialShareBar({
  weekPlan,
  selectedDay,
  multipliers,
  consumed,
  targets,
  foodsById,
  mealsById = MEALS_BY_ID,
}: SocialShareBarProps) {
  const [copiedNote, setCopiedNote] = useState('');

  const metrics = useMemo(
    () =>
      computeSocialProfileMetrics(weekPlan, selectedDay, multipliers, consumed, foodsById, targets, mealsById),
    [weekPlan, selectedDay, multipliers, consumed, foodsById, targets, mealsById]
  );

  const statusText = formatWhatsAppStatus(metrics);
  const planText = formatWhatsAppPlanText(metrics, targets);

  const copyTo = async (text: string, note: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNote(note);
    } catch {
      setCopiedNote('Copy failed — try again.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 sm:px-5 py-3" data-testid="social-share-bar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <h4 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Share your plan (WhatsApp)
        </h4>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate" title={statusText}>
          {statusText}
        </span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="WhatsApp share actions">
        <button
          type="button"
          onClick={() => void copyTo(statusText, 'Status copied — paste it anywhere!')}
          className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy status
        </button>
        <button
          type="button"
          onClick={() => void copyTo(planText, 'Plan copied for WhatsApp — paste and share!')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] text-[11px] font-medium text-teal-800 bg-white/90 dark:bg-slate-800/90 border border-teal-200 dark:border-teal-700 rounded-md backdrop-blur-sm transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy for WhatsApp
        </button>
      </div>
      {copiedNote && (
        <p role="status" aria-live="polite" className="mt-2 text-[11px] text-teal-700 dark:text-teal-300">
          {copiedNote}
        </p>
      )}
    </div>
  );
}
