import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeeklyArchiveEntry } from '../types/nutrition';
import {
  ADHERENCE_TARGET_PCT,
  buildWeeklyAdherenceChartData,
  type WeeklyAdherenceChartPoint,
} from '../utils/habits';

interface WeeklyAdherenceBarChartProps {
  weekHistory: WeeklyArchiveEntry[];
  currentAdherencePct: number;
  currentLoggedMeals: number;
  currentTotalMeals: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeeklyAdherenceChartPoint }>;
}

function AdherenceTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-xs space-y-2 min-w-[195px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5">
        <span className="font-display font-semibold text-slate-900">Week {point.weekLabel}</span>
        <span
          className={`font-mono tabular-nums font-semibold ${
            point.goalMet ? 'text-teal-700' : 'text-amber-700'
          }`}
        >
          {point.adherencePct}%
        </span>
      </div>

      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="font-sans text-slate-600">Meals logged</span>
          <span className="text-slate-900">
            {point.loggedMeals} / {point.totalMeals}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-sans text-slate-600">Active days</span>
          <span className="text-slate-900">{point.activeDays} / 7</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        {point.goalMet
          ? `Core hormonal target met (>= ${ADHERENCE_TARGET_PCT}% or 5/7 days)`
          : `Building consistency toward ${ADHERENCE_TARGET_PCT}% baseline`}
      </p>
    </div>
  );
}

export function WeeklyAdherenceBarChart({
  weekHistory,
  currentAdherencePct,
  currentLoggedMeals,
  currentTotalMeals,
}: WeeklyAdherenceBarChartProps) {
  const summary = useMemo(() => buildWeeklyAdherenceChartData(weekHistory), [weekHistory]);

  return (
    <section
      aria-label="Weekly Adherence History"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Weekly Adherence History
          </h3>
          <p className="text-xs text-slate-500">
            Archived weekly meal-prep adherence (%) against the 5-of-7 day consistency baseline (
            <span className="font-mono tabular-nums">{ADHERENCE_TARGET_PCT}%</span>).
          </p>
        </div>

        {summary.totalWeeks > 0 && summary.bestWeek && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums shrink-0">
            <span className="text-slate-700">
              Avg <strong className="font-semibold text-slate-900">{summary.averageAdherencePct}%</strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-700">
              Best{' '}
              <strong className="font-semibold text-slate-900">
                {summary.bestWeek.weekLabel} ({summary.bestWeek.adherencePct}%)
              </strong>
            </span>
            {summary.trendDeltaPct !== null && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span
                  className={
                    summary.trendDeltaPct > 0
                      ? 'text-teal-700 font-medium'
                      : summary.trendDeltaPct < 0
                        ? 'text-amber-700 font-medium'
                        : 'text-slate-500'
                  }
                >
                  {summary.trendDeltaPct > 0 ? `+${summary.trendDeltaPct}%` : `${summary.trendDeltaPct}%`} vs prior
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {summary.totalWeeks === 0 ? (
        <div
          data-testid="weekly-adherence-empty-state"
          className="bg-slate-50 border border-dashed border-slate-200 rounded-lg px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-800">No archived weeks plotted yet</p>
            <p className="text-xs text-slate-600 max-w-xl">
              Log meals as you eat this week, then select{' '}
              <span className="font-medium text-slate-800">Archive &amp; New Week</span> above to
              record W1 and track week-over-week adherence bars here.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="block text-[11px] text-slate-500">Current week progress</span>
            <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
              {currentAdherencePct}%
            </span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              {' '}
              ({currentLoggedMeals}/{currentTotalMeals} meals)
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-teal-700 inline-block" aria-hidden="true" />
                <span className="font-medium text-slate-800">Core target met</span>
                <span className="font-mono tabular-nums text-slate-500">
                  (&gt;= {ADHERENCE_TARGET_PCT}% or 5/7 days)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-amber-600 inline-block" aria-hidden="true" />
                <span className="font-medium text-slate-800">Building consistency</span>
              </div>
            </div>

            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              Dashed line = {ADHERENCE_TARGET_PCT}% baseline · Showing {summary.points.length} of{' '}
              {summary.totalWeeks} {summary.totalWeeks === 1 ? 'week' : 'weeks'}
            </span>
          </div>

          <div className="h-[230px] w-full min-w-0" data-testid="weekly-adherence-bar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.points} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  tick={{
                    fontSize: 12,
                    fill: '#475569',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  width={44}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: '#64748B',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip cursor={{ fill: '#F1F5F9' }} content={<AdherenceTooltip />} />
                <ReferenceLine
                  y={ADHERENCE_TARGET_PCT}
                  stroke="#0F766E"
                  strokeDasharray="5 4"
                  strokeOpacity={0.65}
                />
                <Bar
                  dataKey="adherencePct"
                  name="Adherence"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                >
                  {summary.points.map((entry) => (
                    <Cell
                      key={entry.weekLabel}
                      fill={entry.goalMet ? '#0F766E' : '#D97706'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
