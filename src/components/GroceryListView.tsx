import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Pencil, Search } from 'lucide-react';
import { REGIONS } from '../data/regions';
import type {
  AffiliateLinkConfig,
  LocationId,
  MarketChannel,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { buildIngredientPurchaseLink } from '../utils/links';
import { partitionGroceryByFulfillment } from '../utils/habits';
import { aggregateWeeklyGrocery, formatCurrency, getMealsById } from '../utils/nutrition';
import { formatWeight } from '../utils/format';

interface GroceryListViewProps {
  weekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  locationId: LocationId;
  foodsById: Record<string, WholeFood>;
  affiliateConfig: AffiliateLinkConfig;
  pantryChecked: Record<string, boolean>;
  onTogglePantryItem: (foodId: string) => void;
  onClearPantryChecked: () => void;
  onOpenAffiliateModal: (focusFoodId?: string) => void;
  onOpenLegalModal: () => void;
}

const MARKET_CHANNELS: Array<MarketChannel | 'all'> = [
  'all',
  'Rythu Bazaar · Produce',
  'Begum Bazaar · Seeds & Grains',
  'Local Poultry, Fish & Butcher',
  'Dairy & Eggs',
];

export function GroceryListView({
  weekPlan,
  multipliers,
  locationId,
  foodsById,
  affiliateConfig,
  pantryChecked,
  onTogglePantryItem,
  onClearPantryChecked,
  onOpenAffiliateModal,
  onOpenLegalModal,
}: GroceryListViewProps) {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<MarketChannel | 'all'>('all');
  const [copyNote, setCopyNote] = useState('');

  const region = REGIONS[locationId] ?? REGIONS.hyderabad;

  const mealsById = useMemo(() => getMealsById(locationId), [locationId]);

  const summary = useMemo(
    () => aggregateWeeklyGrocery(weekPlan, multipliers, mealsById, foodsById, locationId),
    [weekPlan, multipliers, mealsById, foodsById, locationId]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summary.items.filter((item) => {
      if (channelFilter !== 'all' && item.food.marketChannel !== channelFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.food.name.toLowerCase().includes(q) ||
        item.food.localName.toLowerCase().includes(q) ||
        item.food.hyderabadSourceNote.toLowerCase().includes(q)
      );
    });
  }, [summary.items, search, channelFilter]);

  const checkedCount = summary.items.filter((i) => pantryChecked[i.food.id]).length;

  const handleCopyLinks = async () => {
    const links = summary.items.map((item) => buildIngredientPurchaseLink(item.food, affiliateConfig));
    try {
      await navigator.clipboard.writeText(links.map((l) => l.url).join('\n'));
      setCopyNote('All links copied — paste into your browser or a list app!');
    } catch {
      setCopyNote('Copy failed — try again.');
    }
  };
  const remainingCost = summary.items.reduce(
    (sum, item) => (pantryChecked[item.food.id] ? sum : sum + item.totalCostInr),
    0
  );

  const groupedChannels = MARKET_CHANNELS.filter((c): c is MarketChannel => c !== 'all').filter(
    (ch) => channelFilter === 'all' || channelFilter === ch
  );

  const { pantryOnline, freshLocal } = useMemo(
    () => partitionGroceryByFulfillment(summary.items),
    [summary.items]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Auto-Calculated From Active 7-Day Plan · {region.localNote}
          </p>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5 text-balance">
            {region.shortLabel} Weekly Market & Budget List
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onOpenAffiliateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-teal-800 dark:text-teal-200 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Preferred Store</span>
          </button>

          <button
            type="button"
            onClick={onClearPantryChecked}
            disabled={checkedCount === 0}
            className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-300 bg-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Clear Checked ({checkedCount})
          </button>
          <button
            type="button"
            onClick={handleCopyLinks}
            aria-label="Copy all ingredient purchase links to the clipboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All Links</span>
          </button>
          {copyNote && (
            <span role="status" aria-live="polite" className="text-[11px] text-slate-500 dark:text-slate-400">
              {copyNote}
            </span>
          )}
        </div>
      </div>

      {/* Cost Efficiency Strip */}
      <section
        aria-label="Weekly Budget Summary"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">Weekly Market Total</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(summary.totalWeeklyCostInr, locationId)}
          </p>
          <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
            Remaining to buy: {formatCurrency(remainingCost, locationId)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">Daily Average Spend</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-teal-700 dark:text-teal-300 mt-1">
            {formatCurrency(summary.dailyAverageCostInr, locationId)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Whole foods, zero supplements</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">Weekly Protein Yield</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {summary.weeklyProteinG} g
          </p>
          <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
            ~{Math.round(summary.weeklyProteinG / 7)} g/day average
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">Cost per 100g Protein</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(summary.costPer100gProteinInr, locationId)}
          </p>
          <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
            {checkedCount}/{summary.items.length} ingredients stocked
          </p>
        </div>
      </section>

      {/* High-Intent Online Pantry Staples & Affiliate Disclosure */}
      <section
        aria-label="Shelf-Stable Pantry Essentials for Online Ordering"
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Shelf-Stable Pantry Staples ({pantryOnline.length} Online-Ready · {freshLocal.length} Fresh Market)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seeds, nuts, ghee, oils, and whole grains store well in bulk and convert cleanly via storefront links.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenAffiliateModal()}
            className="text-xs font-medium text-teal-700 dark:text-teal-300 hover:text-teal-900 underline-offset-2 hover:underline self-start sm:self-auto whitespace-nowrap"
          >
            Change Preferred Store
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {pantryOnline.slice(0, 6).map((item) => {
            const link = buildIngredientPurchaseLink(item.food, affiliateConfig);
            return (
              <a
                key={item.food.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 hover:bg-teal-50/70 border border-slate-200 dark:border-slate-700 hover:border-teal-200 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.food.name}
                  </span>
                  <span className="block text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {item.practicalQuantityLabel} · {formatCurrency(item.totalCostInr, locationId)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 dark:text-teal-200 whitespace-nowrap shrink-0">
                  <span>{link.sourceLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <p>
            Affiliate Disclosure: As an Amazon Associate I earn from qualifying purchases. Whole foods are selected strictly for micronutrient density and regional cost efficiency at zero extra cost to you.
          </p>
          <button
            type="button"
            onClick={onOpenLegalModal}
            className="text-teal-700 dark:text-teal-300 hover:text-teal-900 font-medium underline underline-offset-2 whitespace-nowrap"
          >
            Privacy & Health Disclaimer
          </button>
        </div>
      </section>

      {/* Delivery & Retail Links */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Amazon Fresh', url: 'https://www.amazon.com/fresh' },
          { label: 'Instacart', url: 'https://www.instacart.com' },
          { label: 'BigBasket', url: 'https://www.bigbasket.com' },
          { label: 'BlinkIt', url: 'https://blinkit.com' },
        ].map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] text-xs font-medium text-teal-800 dark:text-teal-200 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap"
          >
            {l.label}
          </a>
        ))}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${region.shortLabel} ingredient or note...`}
            aria-label="Search grocery items"
            className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
          />
        </div>

        <div
          role="group"
          aria-label={`Filter by ${region.shortLabel} market channel`}
          className="flex flex-wrap items-center gap-1.5"
        >
          {MARKET_CHANNELS.map((channel) => {
            const active = channelFilter === channel;
            const label =
              channel === 'all' ? 'All Markets' : region.marketChannelLabels[channel];
            return (
              <button
                key={channel}
                type="button"
                onClick={() => setChannelFilter(channel)}
                aria-pressed={active}
                className={`px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:bg-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Market Tables */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No grocery items match "{search}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setChannelFilter('all');
            }}
            className="px-4 py-2 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedChannels.map((channel) => {
            const channelItems = filteredItems.filter(
              (item) => item.food.marketChannel === channel
            );
            if (channelItems.length === 0) return null;
            const channelTotal = channelItems.reduce((s, i) => s + i.totalCostInr, 0);
            const channelTitle = region.marketChannelLabels[channel];

            return (
              <section
                key={channel}
                aria-label={channelTitle}
                className="bg-white border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {channelTitle}
                  </h3>
                  <span className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(channelTotal, locationId)}
                  </span>
                </div>

                <div className="divide-y divide-slate-200">
                  {channelItems.map((item) => {
                    const isChecked = Boolean(pantryChecked[item.food.id]);
                    const link = buildIngredientPurchaseLink(item.food, affiliateConfig);
                    return (
                      <div
                        key={item.food.id}
                        className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:bg-slate-800/70 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => onTogglePantryItem(item.food.id)}
                            aria-pressed={isChecked}
                            aria-label={`Mark ${item.food.name} as ${isChecked ? 'needed' : 'bought'}`}
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-teal-700 border-teal-700 text-white'
                                : 'bg-white border-slate-300 text-slate-400 hover:border-teal-600'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                isChecked ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {item.food.name}{' '}
                              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                ({item.food.localName})
                              </span>
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {item.food.hyderabadSourceNote}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                          <span className="font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatWeight(item.totalGrams, locationId)}
                          </span>
                          <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100 min-w-[3.5rem] text-right">
                            {formatCurrency(item.totalCostInr, locationId)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              aria-label={`Buy ${item.food.name} (${link.sourceLabel})`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-teal-800 dark:text-teal-200 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors whitespace-nowrap"
                            >
                              <span>{link.sourceLabel}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => onOpenAffiliateModal(item.food.id)}
                              aria-label={`Edit custom affiliate link for ${item.food.name}`}
                              title="Edit affiliate or store URL"
                              className="p-1.5 min-h-[34px] min-w-[34px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 bg-white hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
