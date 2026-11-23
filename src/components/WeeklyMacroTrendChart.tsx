import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  ConsumedState,
  DayMealSelection,
  DayOfWeek,
  MacroTargets,
  MealTemplate,
  PortionMultipliers,
  WholeFood,
} from '../types/nutrition';
import {
  buildWeeklyMacroTrendData,
  FOODS_BY_ID,
  MEALS_BY_ID,
  type WeeklyMacroTrendPoint,
} from '../utils/nutrition';

interface WeeklyMacroTrendChartProps {
  weekPlan: Record<DayOfWeek, DayMealSelection>;
  multipliers: PortionMultipliers;
  consumed: ConsumedState;
  targets: MacroTargets;
  fatFloorGrams: number;
  selectedDay: DayOfWeek;
  foodsById?: Record<string, WholeFood>;
  mealsById?: Record<string, MealTemplate>;
}

type TrendSourceMode = 'planned' | 'consumed';
type TrendUnitMode = 'percent' | 'grams';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeeklyMacroTrendPoint }>;
  unitMode: TrendUnitMode;
  fatFloorGrams: number;
}

function MacroTrendTooltip({ active, payload, unitMode, fatFloorGrams }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-xs space-y-2 min-w-[210px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5">
        <span className="font-display font-semibold text-slate-900">{point.day}</span>
        <span className="font-mono tabular-nums text-slate-500">{point.calories} kcal</span>
      </div>

      <div className="space-y-1.5 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="font-sans text-teal-800 font-medium">Protein</span>
          <span className="text-slate-900">
            {point.proteinG}g / {point.proteinTargetG}g ({point.proteinPct}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-sans text-amber-700 font-medium">Fats</span>
          <span className="text-slate-900">
            {point.fatG}g / {point.fatTargetG}g ({point.fatPct}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-sans text-blue-700 font-medium">Carbs</span>
          <span className="text-slate-900">
            {point.carbsG}g / {point.carbsTargetG}g ({point.carbsPct}%)
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        {point.fatG >= fatFloorGrams
          ? `Steroidogenic fat floor met (>= ${fatFloorGrams}g)`
          : `Below ${fatFloorGrams}g hormonal fat floor`}
        {unitMode === 'grams' ? ' · Absolute grams view' : ' · % of hormonal target'}
      </p>
    </div>
  );
}

export function WeeklyMacroTrendChart({
  weekPlan,
  multipliers,
  consumed,
  targets,
  fatFloorGrams,
  selectedDay,
  foodsById = FOODS_BY_ID,
  mealsById = MEALS_BY_ID,
}: WeeklyMacroTrendChartProps) {
  const [sourceMode, setSourceMode] = useState<TrendSourceMode>('planned');
  const [unitMode, setUnitMode] = useState<TrendUnitMode>('percent');

  const data = useMemo(
    () =>
      buildWeeklyMacroTrendData(
        weekPlan,
        multipliers,
        consumed,
        targets,
        sourceMode,
        fatFloorGrams,
        foodsById,
        mealsById
      ),
    [weekPlan, multipliers, consumed, targets, sourceMode, fatFloorGrams, foodsById, mealsById]
  );

  const avgProteinPct = Math.round(
    data.reduce((sum, d) => sum + d.proteinPct, 0) / data.length
  );
  const avgFatPct = Math.round(data.reduce((sum, d) => sum + d.fatPct, 0) / data.length);
  const avgCarbsPct = Math.round(data.reduce((sum, d) => sum + d.carbsPct, 0) / data.length);

  return (
    <section
      aria-label="Weekly Macro Intake Trend"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Weekly Macro Intake vs. Hormonal Targets
          </h3>
          <p className="text-xs text-slate-500">
            Tracks Mon–Sun protein, steroidogenic fats, and complex carbs against your{' '}
            <span className="font-mono tabular-nums">
              {targets.proteinG}g P · {targets.fatG}g F · {targets.carbsG}g C
            </span>{' '}
            optimization targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Macro trend data source"
            className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setSourceMode('planned')}
              aria-pressed={sourceMode === 'planned'}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sourceMode === 'planned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Planned Week
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('consumed')}
              aria-pressed={sourceMode === 'consumed'}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                sourceMode === 'consumed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logged Eaten
            </button>
          </div>

          <div
            role="group"
            aria-label="Macro trend chart units"
            className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setUnitMode('percent')}
              aria-pressed={unitMode === 'percent'}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                unitMode === 'percent'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              % of Target
            </button>
            <button
              type="button"
              onClick={() => setUnitMode('grams')}
              aria-pressed={unitMode === 'grams'}
              className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                unitMode === 'grams'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grams (g)
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Weekly Target Adherence Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-teal-700 inline-block" aria-hidden="true" />
            <span className="font-medium text-slate-800">Protein</span>
            <span className="font-mono tabular-nums text-slate-500">
              avg {avgProteinPct}% of {targets.proteinG}g
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-amber-600 inline-block" aria-hidden="true" />
            <span className="font-medium text-slate-800">Healthy Fats</span>
            <span className="font-mono tabular-nums text-slate-500">
              avg {avgFatPct}% of {targets.fatG}g
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-blue-600 inline-block" aria-hidden="true" />
            <span className="font-medium text-slate-800">Complex Carbs</span>
            <span className="font-mono tabular-nums text-slate-500">
              avg {avgCarbsPct}% of {targets.carbsG}g
            </span>
          </div>
        </div>

        <span className="text-[11px] font-mono tabular-nums text-slate-500">
          {unitMode === 'percent'
            ? 'Dashed line = 100% hormonal target'
            : `Target lines: ${targets.proteinG}g P · ${targets.fatG}g F · ${targets.carbsG}g C`}
        </span>
      </div>

      {/* Recharts Trend Canvas */}
      <div className="h-[270px] w-full min-w-0" data-testid="weekly-macro-trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: '#475569' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              width={48}
              domain={unitMode === 'percent' ? [0, 'auto'] : [0, 'auto']}
              tickFormatter={(val) => (unitMode === 'percent' ? `${val}%` : `${val}g`)}
            />
            <Tooltip
              content={<MacroTrendTooltip unitMode={unitMode} fatFloorGrams={fatFloorGrams} />}
            />

            <ReferenceLine
              x={selectedDay}
              stroke="#94A3B8"
              strokeDasharray="2 3"
              label={{
                value: selectedDay,
                position: 'top',
                fill: '#475569',
                fontSize: 10,
              }}
            />

            {unitMode === 'percent' ? (
              <ReferenceLine
                y={100}
                stroke="#0F766E"
                strokeDasharray="5 4"
                strokeOpacity={0.65}
              />
            ) : (
              <>
                <ReferenceLine
                  y={targets.proteinG}
                  stroke="#0F766E"
                  strokeDasharray="5 4"
                  strokeOpacity={0.55}
                />
                <ReferenceLine
                  y={targets.fatG}
                  stroke="#D97706"
                  strokeDasharray="5 4"
                  strokeOpacity={0.55}
                />
                <ReferenceLine
                  y={targets.carbsG}
                  stroke="#2563EB"
                  strokeDasharray="5 4"
                  strokeOpacity={0.45}
                />
              </>
            )}

            <Line
              type="monotone"
              dataKey={unitMode === 'percent' ? 'proteinPct' : 'proteinG'}
              name="Protein"
              stroke="#0F766E"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#0F766E', strokeWidth: 0 }}
              activeDot={{ r: 5.5, fill: '#0F766E', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={unitMode === 'percent' ? 'fatPct' : 'fatG'}
              name="Healthy Fats"
              stroke="#D97706"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={{ r: 3.5, fill: '#D97706', strokeWidth: 0 }}
              activeDot={{ r: 5.5, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={unitMode === 'percent' ? 'carbsPct' : 'carbsG'}
              name="Complex Carbs"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
