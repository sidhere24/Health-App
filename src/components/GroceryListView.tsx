import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Minus,
  Pencil,
  Plus,
  Printer,
  Search,
  Share2,
  Users,
} from 'lucide-react';
import { REGIONS } from '../data/regions';
import type {
  AffiliateLinkConfig,
  LocationId,
  MarketChannel,
  MealTemplate,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { buildIngredientPurchaseLink } from '../utils/links';
import { partitionGroceryByFulfillment } from '../utils/habits';
import {
  aggregateWeeklyGrocery,
  formatCurrency,
  formatGroceryShareText,
  MEALS_BY_ID,
} from '../utils/nutrition';

interface GroceryListViewProps {
  weekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  locationId: LocationId;
  householdServings?: number;
  onChangeHouseholdServings?: (servings: number) => void;
  foodsById: Record<string, WholeFood>;
  mealsById?: Record<string, MealTemplate>;
  affiliateConfig: AffiliateLinkConfig;
  pantryChecked: Record<string, boolean>;
  onTogglePantryItem: (foodId: string) => void;
  onClearPantryChecked: () => void;
  onOpenAffiliateModal: (focusFoodId?: string) => void;
  onOpenLegalModal: () => void;
  onJumpToLabs?: () => void;
  onNotify?: (message: string) => void;
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
  householdServings = 1,
  onChangeHouseholdServings,
  foodsById,
  mealsById = MEALS_BY_ID,
  affiliateConfig,
  pantryChecked,
  onTogglePantryItem,
  onClearPantryChecked,
  onOpenAffiliateModal,
  onOpenLegalModal,
  onJumpToLabs,
  onNotify,
}: GroceryListViewProps) {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<MarketChannel | 'all'>('all');
  const [copiedJustNow, setCopiedJustNow] = useState(false);
  const [mobileSection, setMobileSection] = useState<'list' | 'summary'>('list');

  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const servings = Math.max(1, Math.min(6, Math.round(householdServings || 1)));

  const summary = useMemo(
    () => aggregateWeeklyGrocery(weekPlan, multipliers, mealsById, foodsById, servings),
    [weekPlan, multipliers, mealsById, foodsById, servings]
  );

  const shareText = useMemo(
    () => formatGroceryShareText(summary.items, locationId, pantryChecked, servings),
    [summary.items, locationId, pantryChecked, servings]
  );

  const handleCopyList = async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedJustNow(true);
      window.setTimeout(() => setCopiedJustNow(false), 2000);
      onNotify?.(`Copied ${servings}-person shopping list to clipboard`);
    } else {
      onNotify?.('Unable to copy automatically — try Print Sheet or Export CSV');
    }
  };

  const handleShareList = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `HydraPrep Weekly Grocery List (${region.shortLabel})`,
          text: shareText,
        });
        return;
      } catch {
        // User canceled or share unsupported; fall back to clipboard copy
      }
    }
    await handleCopyList();
  };

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
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <p className="text-xs sm:text-sm text-slate-600">
            Scaled for {servings} {servings === 1 ? 'person' : 'people'} · {region.localNote}
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5 text-balance">
            {region.shortLabel} Weekly Market & Budget List
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto print-hidden">
          {onChangeHouseholdServings && (
            <div
              aria-label="Household servings multiplier"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[40px] bg-white border border-slate-200 rounded-lg"
            >
              <Users className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Household:</span>
              <button
                type="button"
                aria-label="Decrease grocery servings"
                disabled={servings <= 1}
                onClick={() => onChangeHouseholdServings(Math.max(1, servings - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="min-w-[1.25rem] text-center text-xs font-mono tabular-nums font-semibold text-slate-900">
                {servings}
              </span>
              <button
                type="button"
                aria-label="Increase grocery servings"
                disabled={servings >= 6}
                onClick={() => onChangeHouseholdServings(Math.min(6, servings + 1))}
                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCopyList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {copiedJustNow ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJustNow ? 'Copied List' : 'Copy List'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareList}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAffiliateModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Link2 className="w-3.5 h-3.5 text-teal-700" />
            <span>Preferred Store</span>
          </button>

          <button
            type="button"
            onClick={onClearPantryChecked}
            disabled={checkedCount === 0}
            className="px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Clear Checked ({checkedCount})
          </button>
        </div>
      </div>

      {/* Mobile 2-Tab Switcher: open directly into Shopping List without long scroll */}
      <div
        role="tablist"
        aria-label="Grocery screen switcher"
        className="lg:hidden grid grid-cols-2 p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1 print-hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileSection === 'list'}
          onClick={() => setMobileSection('list')}
          className={`py-2 min-h-[42px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            mobileSection === 'list'
              ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Shopping List ({summary.items.length - checkedCount} left)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileSection === 'summary'}
          onClick={() => setMobileSection('summary')}
          className={`py-2 min-h-[42px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            mobileSection === 'summary'
              ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Budget & Pantry
        </button>
      </div>

      {/* Cost Efficiency Strip */}
      <section
        aria-label="Weekly Budget Summary"
        className={`${mobileSection === 'summary' ? 'grid' : 'hidden lg:grid'} grid-cols-2 lg:grid-cols-4 gap-4`}
      >
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Weekly Market Total</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 mt-1">
            {formatCurrency(summary.totalWeeklyCostInr, locationId)}
          </p>
          <p className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
            Remaining to buy: {formatCurrency(remainingCost, locationId)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Daily Average Spend</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-teal-700 mt-1">
            {formatCurrency(summary.dailyAverageCostInr, locationId)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Whole foods, zero supplements</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Weekly Protein Yield</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 mt-1">
            {summary.weeklyProteinG} g
          </p>
          <p className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
            ~{Math.round(summary.weeklyProteinG / 7)} g/day average
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Cost per 100g Protein</span>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 mt-1">
            {formatCurrency(summary.costPer100gProteinInr, locationId)}
          </p>
          <p className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
            {checkedCount}/{summary.items.length} ingredients stocked
          </p>
        </div>
      </section>

      {/* High-Intent Online Pantry Staples & Affiliate Disclosure */}
      <section
        aria-label="Shelf-Stable Pantry Essentials for Online Ordering"
        className={`${mobileSection === 'summary' ? 'block' : 'hidden lg:block'} bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Shelf-Stable Pantry Staples ({pantryOnline.length} Online-Ready · {freshLocal.length} Fresh Market)
            </h3>
            <p className="text-xs text-slate-500">
              Seeds, nuts, ghee, oils, and whole grains store well in bulk and convert cleanly via storefront links.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenAffiliateModal()}
            className="text-xs font-medium text-teal-700 hover:text-teal-900 underline-offset-2 hover:underline self-start sm:self-auto whitespace-nowrap"
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
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-200 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-slate-900 truncate">
                    {item.food.name}
                  </span>
                  <span className="block text-[11px] font-mono tabular-nums text-slate-500">
                    {item.practicalQuantityLabel} · {formatCurrency(item.totalCostInr, locationId)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 whitespace-nowrap shrink-0">
                  <span>{link.sourceLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
          <p>
            Affiliate Disclosure: As an Amazon Associate I earn from qualifying purchases. Whole foods are selected strictly for micronutrient density and regional cost efficiency at zero extra cost to you.
          </p>
          <button
            type="button"
            onClick={onOpenLegalModal}
            className="text-teal-700 hover:text-teal-900 font-medium underline underline-offset-2 whitespace-nowrap"
          >
            Privacy & Health Disclaimer
          </button>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <div className={`${mobileSection === 'list' ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:items-center justify-between gap-3`}>
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${region.shortLabel} ingredient or note...`}
            aria-label="Search grocery items"
            className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
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
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'
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
        <div className={`${mobileSection === 'list' ? 'block' : 'hidden lg:block'} bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3`}>
          <p className="text-sm font-medium text-slate-800">
            No grocery items match "{search}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setChannelFilter('all');
            }}
            className="px-4 py-2 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className={`${mobileSection === 'list' ? 'space-y-5' : 'hidden lg:block lg:space-y-5'}`}>
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
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    {channelTitle}
                  </h3>
                  <span className="font-mono tabular-nums text-xs font-semibold text-slate-800">
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
                        className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
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
                                isChecked ? 'text-slate-400 line-through' : 'text-slate-900'
                              }`}
                            >
                              {item.food.name}{' '}
                              <span className="text-xs font-normal text-slate-500">
                                ({item.food.localName})
                              </span>
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {item.food.hyderabadSourceNote}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                          <span className="font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                            {item.practicalQuantityLabel}
                          </span>
                          <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 min-w-[3.5rem] text-right">
                            {formatCurrency(item.totalCostInr, locationId)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              aria-label={`Buy ${item.food.name} (${link.sourceLabel})`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors whitespace-nowrap"
                            >
                              <span>{link.sourceLabel}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => onOpenAffiliateModal(item.food.id)}
                              aria-label={`Edit custom affiliate link for ${item.food.name}`}
                              title="Edit affiliate or store URL"
                              className="p-1.5 min-h-[34px] min-w-[34px] text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center transition-colors"
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

      {/* Next Screen Jump Bar */}
      {onJumpToLabs && (
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 print-hidden">
          <button
            type="button"
            onClick={() => setMobileSection(mobileSection === 'list' ? 'summary' : 'list')}
            className="lg:hidden px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl whitespace-nowrap"
          >
            {mobileSection === 'list' ? 'View Budget & Pantry' : 'Back to Shopping List'}
          </button>
          <button
            type="button"
            onClick={onJumpToLabs}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl whitespace-nowrap"
          >
            <span>Next: Lab Tests AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
