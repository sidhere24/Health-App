import { Check, Clock } from 'lucide-react';
import { BATCH_PREP_TASKS } from '../data/hyderabadMeals';
import type {
  ConsumedState,
  DayOfWeek,
  LocationId,
  MacroTargets,
  MealSlot,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { formatCurrency, getWeeklyDaySummaries } from '../utils/nutrition';

interface WeeklyPrepViewProps {
  weekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  consumed: ConsumedState;
  targets: MacroTargets;
  locationId: LocationId;
  foodsById: Record<string, WholeFood>;
  batchDone: Record<string, boolean>;
  onToggleBatchTask: (taskId: string) => void;
  onJumpToDay: (day: DayOfWeek) => void;
  onOpenSwapModal: (day: DayOfWeek, slot: MealSlot) => void;
}

export function WeeklyPrepView({
  weekPlan,
  multipliers,
  consumed,
  targets,
  locationId,
  foodsById,
  batchDone,
  onToggleBatchTask,
  onJumpToDay,
  onOpenSwapModal,
}: WeeklyPrepViewProps) {
  const summaries = getWeeklyDaySummaries(weekPlan, multipliers, consumed, foodsById);

  const weeklyAvgCost =
    summaries.reduce((acc, s) => acc + s.planned.costInr, 0) / summaries.length;
  const weeklyAvgProtein = Math.round(
    summaries.reduce((acc, s) => acc + s.planned.proteinG, 0) / summaries.length
  );
  const completedBatchCount = BATCH_PREP_TASKS.filter((t) => batchDone[t.id]).length;

  const sessions: Array<'Sunday Batch (75 min)' | 'Wednesday Refresh (45 min)'> = [
    'Sunday Batch (75 min)',
    'Wednesday Refresh (45 min)',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            7-Day Rotation · Two Batch Sessions · Zero Weekday Cooking Bottlenecks
          </p>
          <h2 className="font-display text-xl font-semibold text-slate-900 mt-0.5 text-balance">
            Weekly Meal Matrix & Batch Workflow
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600">
          <span>Avg {weeklyAvgProtein}g Protein/day</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span>Avg {formatCurrency(weeklyAvgCost, locationId)}/day</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span>
            Batch Prep {completedBatchCount}/{BATCH_PREP_TASKS.length} done
          </span>
        </div>
      </div>

      {/* 7-Day High-Density Matrix Table */}
      <section
        aria-label="7-Day Meal Matrix"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-3">Breakfast</th>
                <th className="py-3 px-3">Lunch</th>
                <th className="py-3 px-3">Pre-Training Snack</th>
                <th className="py-3 px-3">Dinner</th>
                <th className="py-3 px-3 text-right">Energy</th>
                <th className="py-3 px-3 text-right">Protein</th>
                <th className="py-3 px-3 text-right">Zinc</th>
                <th className="py-3 px-3 text-right">Nitrates</th>
                <th className="py-3 px-4 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {summaries.map((row) => {
                const underCap = row.planned.costInr <= targets.dailyBudgetInr;
                return (
                  <tr key={row.day} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => onJumpToDay(row.day)}
                        className="font-display font-semibold text-teal-700 hover:text-teal-900 underline-offset-2 hover:underline text-left"
                      >
                        {row.day}
                      </button>
                      <span className="block text-[11px] font-mono tabular-nums text-slate-400">
                        {row.consumedCount}/4 logged
                      </span>
                    </td>

                    {(['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]).map((slot) => (
                      <td key={slot} className="py-3 px-3 align-top max-w-[190px]">
                        <button
                          type="button"
                          onClick={() => onOpenSwapModal(row.day, slot)}
                          title="Click to swap meal"
                          className="text-left text-slate-800 hover:text-teal-700 transition-colors leading-snug line-clamp-2"
                        >
                          {row.meals[slot]?.name}
                        </button>
                      </td>
                    ))}

                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {row.planned.calories}
                    </td>
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-900 font-medium whitespace-nowrap">
                      {row.planned.proteinG}g
                    </td>
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.planned.zincMg}mg
                    </td>
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.planned.nitratesMg}mg
                    </td>
                    <td
                      className={`py-3 px-4 align-top text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        underCap ? 'text-teal-700' : 'text-amber-700'
                      }`}
                    >
                      {formatCurrency(row.planned.costInr, locationId)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Two-Session Batch Prep Checklists */}
      <section aria-label="Batch Prep Checklists" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sessions.map((sessionName) => {
          const tasks = BATCH_PREP_TASKS.filter((t) => t.session === sessionName);
          const sessionDone = tasks.filter((t) => batchDone[t.id]).length;

          return (
            <div key={sessionName} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-700" />
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    {sessionName}
                  </h3>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {sessionDone}/{tasks.length} complete
                </span>
              </div>

              <div className="divide-y divide-slate-100 mt-1">
                {tasks.map((task) => {
                  const checked = Boolean(batchDone[task.id]);
                  return (
                    <div key={task.id} className="py-3.5 flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleBatchTask(task.id)}
                        aria-pressed={checked}
                        aria-label={`Mark batch task "${task.title}" as ${checked ? 'incomplete' : 'complete'}`}
                        className={`mt-0.5 w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-white border-slate-300 text-slate-400 hover:border-teal-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs">
                          <span
                            className={`font-medium ${
                              checked ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-500">{task.storageNote}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{task.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
