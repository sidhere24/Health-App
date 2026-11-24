import { useMemo, useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { REGIONS } from '../data/regions';
import type {
  AffiliateLinkConfig,
  BiologicalSex,
  HormonalPathway,
  LocationId,
  MarketChannel,
  WholeFood,
} from '../types/nutrition';
import { buildIngredientPurchaseLink } from '../utils/links';
import { filterWholeFoods, formatCurrency, getInclusivePathwayLabel } from '../utils/nutrition';

interface FoodIndexViewProps {
  locationId: LocationId;
  sex?: BiologicalSex;
  foods: WholeFood[];
  affiliateConfig: AffiliateLinkConfig;
  onOpenAddFoodModal: () => void;
  onOpenAffiliateModal: (focusFoodId?: string) => void;
  onDeleteCustomFood: (foodId: string) => void;
}

const PATHWAYS: Array<HormonalPathway | 'all'> = [
  'all',
  'Testosterone & Steroidogenesis',
  'Nitric Oxide & Vascular Flow',
  'Sperm Quality & Zinc/Selenium',
  'Cortisol & Stress Recovery',
];

const MARKETS: Array<MarketChannel | 'all'> = [
  'all',
  'Rythu Bazaar · Produce',
  'Begum Bazaar · Seeds & Grains',
  'Local Poultry, Fish & Butcher',
  'Dairy & Eggs',
];

export function FoodIndexView({
  locationId,
  sex = 'neutral',
  foods,
  affiliateConfig,
  onOpenAddFoodModal,
  onOpenAffiliateModal,
  onDeleteCustomFood,
}: FoodIndexViewProps) {
  const [query, setQuery] = useState('');
  const [pathway, setPathway] = useState<HormonalPathway | 'all'>('all');
  const [market, setMarket] = useState<MarketChannel | 'all'>('all');

  const region = REGIONS[locationId] ?? REGIONS.hyderabad;

  const filtered = useMemo(
    () => filterWholeFoods(foods, query, pathway, market),
    [foods, query, pathway, market]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm text-slate-600">
            {foods.length} Verified Whole Foods · {region.shortLabel} Pricing & Sourcing
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5 text-balance">
            {region.shortLabel} Whole-Food & Nutrition Index
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onOpenAffiliateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Link2 className="w-3.5 h-3.5 text-teal-700" />
            <span>Preferred Store</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddFoodModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Local Food</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search food, ${region.shortLabel} local name, or mechanism (e.g. Zinc, Nitrate)...`}
              aria-label={`Search ${region.shortLabel} whole foods`}
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>

          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as MarketChannel | 'all')}
            aria-label={`Filter by ${region.shortLabel} market channel`}
            className="px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m === 'all' ? `All ${region.shortLabel} Markets` : region.marketChannelLabels[m]}
              </option>
            ))}
          </select>
        </div>

        <div
          role="group"
          aria-label="Filter by nutrition benefit"
          className="flex flex-wrap items-center gap-1.5"
        >
          {PATHWAYS.map((p) => {
            const active = pathway === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPathway(p)}
                aria-pressed={active}
                className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {p === 'all' ? 'All Benefits' : getInclusivePathwayLabel(p, sex)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Showing {filtered.length} whole foods (values per 100g edible portion)</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800">
            No whole foods match your current filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setPathway('all');
              setMarket('all');
            }}
            className="px-4 py-2 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((food) => {
            const link = buildIngredientPurchaseLink(food, affiliateConfig);
            return (
              <article
                key={food.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-teal-800 font-medium">
                      {getInclusivePathwayLabel(food.primaryPathway, sex)}
                      {food.isCustom && (
                        <span className="text-slate-500 font-normal"> · Custom Local</span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(food.pricePer100gInr, locationId)} / 100g
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {food.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {food.localName} · {region.marketChannelLabels[food.marketChannel]}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {food.bioactiveMechanism}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-5 gap-2 text-center bg-slate-50 rounded-lg py-2 px-2">
                    <div>
                      <span className="block text-[10px] text-slate-500">Protein</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                        {food.per100g.proteinG}g
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Fat</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                        {food.per100g.fatG}g
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Zinc</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                        {food.per100g.zincMg}mg
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Mg</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                        {food.per100g.magnesiumMg}mg
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">NO3</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                        {food.per100g.nitratesMg}mg
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-700">
                        {region.shortLabel} Sourcing:
                      </span>{' '}
                      {food.hyderabadSourceNote}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Prep Tip:</span>{' '}
                      {food.prepTip}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      aria-label={`Buy ${food.name} (${link.sourceLabel})`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors whitespace-nowrap"
                    >
                      <span>{link.isCustom ? 'Open Custom Link' : `Buy via ${link.sourceLabel}`}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenAffiliateModal(food.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit Link</span>
                      </button>

                      {food.isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustomFood(food.id)}
                          aria-label={`Delete custom food ${food.name}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 rounded-md transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
