import { type FormEvent, useMemo, useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { REGIONS } from '../data/regions';
import type {
  AffiliateLinkConfig,
  HormonalPathway,
  LocationId,
  MarketChannel,
  MealTemplate,
  MealSlot,
  WholeFood,
} from '../types/nutrition';
import type { SpoonacularSearchResult } from '../types/spoonacular';
import { buildIngredientPurchaseLink } from '../utils/links';
import { filterWholeFoods, formatCurrency } from '../utils/nutrition';
import { recipeToMeal, type SpoonCharacterRecipeInfo } from '../utils/recipeImport';

interface FoodIndexViewProps {
  locationId: LocationId;
  foods: WholeFood[];
  affiliateConfig: AffiliateLinkConfig;
  onOpenAddFoodModal: () => void;
  onOpenAffiliateModal: (focusFoodId?: string) => void;
  onDeleteCustomFood: (foodId: string) => void;
  onAddMealToPlan?: (meal: MealTemplate, slot: MealSlot) => void;
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
  foods,
  affiliateConfig,
  onOpenAddFoodModal,
  onOpenAffiliateModal,
  onDeleteCustomFood,
  onAddMealToPlan,
}: FoodIndexViewProps) {
  const [query, setQuery] = useState('');
  const [pathway, setPathway] = useState<HormonalPathway | 'all'>('all');
  const [market, setMarket] = useState<MarketChannel | 'all'>('all');
  const [addNote, setAddNote] = useState('');

  const [sqQuery, setSqQuery] = useState('');
  const [sqResults, setSqResults] = useState<SpoonacularSearchResult[]>([]);
  const [sqLoading, setSqLoading] = useState(false);
  const [sqError, setSqError] = useState(false);

  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const handleAddMealToPlan = async (r: SpoonacularSearchResult) => {
    setAddNote('Loading recipe…');
    try {
      const res = await fetch(`/api/spoonacular/recipe/${r.id}/information`);
      const data = (await res.json()) as SpoonCharacterRecipeInfo;
      const meal = recipeToMeal(data, 'lunch');
      if (!meal) {
        setAddNote('No matching ingredients found for this recipe.');
        return;
      }
      setAddNote('Added to plan — see the meal schedule.');
      onAddMealToPlan?.(meal, 'lunch');
      setTimeout(() => setAddNote(''), 3000);
    } catch {
      setAddNote('Recipe load failed — try again.');
    }
  };

  const filtered = useMemo(
    () => filterWholeFoods(foods, query, pathway, market),
    [foods, query, pathway, market]
  );

  const handleSqSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = sqQuery.trim();
    if (!q) {
      setSqResults([]);
      return;
    }
    setSqLoading(true);
    try {
      const res = await fetch(`/api/spoonacular/search?query=${encodeURIComponent(q)}&number=20`);
      const data = (await res.json()) as { results?: SpoonacularSearchResult[] };
      if (!res.ok) { setSqError(true); setSqResults([]); return; }
      setSqResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setSqResults([]);
    } finally {
      setSqLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {foods.length} Verified Whole Foods · {region.shortLabel} Pricing & Sourcing
          </p>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5 text-balance">
            {region.shortLabel} Whole-Food & Hormonal Science Index
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onOpenAffiliateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-300 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
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
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>

          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as MarketChannel | 'all')}
            aria-label={`Filter by ${region.shortLabel} market channel`}
            className="px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700"
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
          aria-label="Filter by hormonal pathway"
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
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-slate-50 text-slate-600 dark:text-slate-400 border-slate-200 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
                }`}
              >
                {p === 'all' ? 'All Pathways' : p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spoonacular Recipe Search (Free Tier) */}
      <form
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3"
        onSubmit={handleSqSearch}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={sqQuery}
              onChange={(e) => setSqQuery(e.target.value)}
              placeholder="Search Spoonacular recipes, e.g. 'egg bhurji', 'pumpkin seed bowl'..."
              aria-label="Search Spoonacular recipes"
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>
          <button
            type="submit"
            disabled={sqLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-teal-800 dark:text-teal-200 bg-teal-50 border border-teal-200 hover:bg-teal-100 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{sqLoading ? 'Searching…' : 'Search Recipes'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Spoonacular database search — free tier, proxied by the server. Click a recipe to open
          Spoonacular.
        </p>
        {sqLoading && (<p className="text-[11px] text-slate-500 dark:text-slate-400">Searching…</p>)}
        {sqError && (<p className="text-[11px] text-red-600 dark:text-red-400">Search failed — check your connection or try a different query.</p>)}
        {!sqLoading && !sqError && sqResults.length === 0 && sqQuery && (<p className="text-[11px] text-slate-500 dark:text-slate-400">No Spoonacular recipes found for "{sqQuery.trim()}". Try different words.</p>)}
        {sqResults.length > 0 && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sqResults.map((r) => (
              <a key={r.id} href={`https://spoonacular.com/recipes/${r.id}`} target="_blank" rel="noopener noreferrer" className="block border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-left hover:border-teal-200 dark:hover:border-teal-600 transition-colors">
  <span className="block font-medium text-slate-900 dark:text-slate-100 text-sm">{r.title}</span>
  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">
    {r.readyInMinutes ? `${r.readyInMinutes} min` : ""}
    {r.servings ? ` · ${r.servings} servings` : ""}
    {r.nutrition?.calories ? ` · ${r.nutrition.calories} kcal` : ""}
    {r.nutrition?.protein ? ` · ${r.nutrition.protein}g P` : ""}
    {r.nutrition?.fat ? ` · ${r.nutrition.fat}g F` : ""}
    {r.nutrition?.carbs ? ` · ${r.nutrition.carbs}g C` : ""}
  </span>
  <span className="mt-2 flex flex-col items-end gap-1">
    <button type="button" onClick={(e) => { e.preventDefault(); void handleAddMealToPlan(r); }} disabled={sqLoading} className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[30px] text-[11px] font-medium text-teal-800 bg-white/90 dark:bg-slate-800/90 border border-teal-200 dark:border-teal-700 rounded-md backdrop-blur-sm transition-colors whitespace-nowrap">Add to plan</button>
    {addNote && <span role="status" aria-live="polite" className="text-[11px] text-teal-700 dark:text-teal-300">{addNote}</span>}
  </span>
</a>
            ))}
          </div>
        )}
      </form>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Showing {filtered.length} whole foods (values per 100g edible portion)</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
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
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-teal-800 dark:text-teal-200 font-medium">
                      {food.primaryPathway}
                      {food.isCustom && (
                        <span className="text-slate-500 dark:text-slate-400 font-normal"> · Custom Local</span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(food.pricePer100gInr, locationId)} / 100g
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      {food.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {food.localName} · {region.marketChannelLabels[food.marketChannel]}
                    </p>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {food.bioactiveMechanism}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="grid grid-cols-5 gap-2 text-center bg-slate-50 dark:bg-slate-700 rounded-lg py-2 px-2">
                    <div>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Protein</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {food.per100g.proteinG}g
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Fat</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {food.per100g.fatG}g
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Zinc</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {food.per100g.zincMg}mg
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Mg</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {food.per100g.magnesiumMg}mg
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">NO3</span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {food.per100g.nitratesMg}mg
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {region.shortLabel} Sourcing:
                      </span>{' '}
                      {food.hyderabadSourceNote}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Prep Tip:</span>{' '}
                      {food.prepTip}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      aria-label={`Buy ${food.name} (${link.sourceLabel})`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-teal-800 dark:text-teal-200 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors whitespace-nowrap"
                    >
                      <span>{link.isCustom ? 'Open Custom Link' : `Buy via ${link.sourceLabel}`}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenAffiliateModal(food.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors whitespace-nowrap"
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
