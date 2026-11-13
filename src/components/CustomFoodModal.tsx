import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { REGIONS } from '../data/regions';
import type { HormonalPathway, LocationId, MarketChannel, WholeFood } from '../types/nutrition';
import { sanitizeExternalUrl } from '../utils/links';

interface CustomFoodModalProps {
  isOpen: boolean;
  locationId: LocationId;
  onAddFood: (food: WholeFood, customUrl?: string) => void;
  onClose: () => void;
}

const PATHWAYS: HormonalPathway[] = [
  'Testosterone & Steroidogenesis',
  'Nitric Oxide & Vascular Flow',
  'Sperm Quality & Zinc/Selenium',
  'Cortisol & Stress Recovery',
];

const CHANNELS: MarketChannel[] = [
  'Rythu Bazaar · Produce',
  'Begum Bazaar · Seeds & Grains',
  'Local Poultry, Fish & Butcher',
  'Dairy & Eggs',
];

export function CustomFoodModal({
  isOpen,
  locationId,
  onAddFood,
  onClose,
}: CustomFoodModalProps) {
  const region = REGIONS[locationId] ?? REGIONS.hyderabad;

  const [name, setName] = useState('');
  const [localName, setLocalName] = useState('');
  const [marketChannel, setMarketChannel] = useState<MarketChannel>('Rythu Bazaar · Produce');
  const [pricePer100g, setPricePer100g] = useState('15');
  const [proteinG, setProteinG] = useState('12');
  const [carbsG, setCarbsG] = useState('10');
  const [fatG, setFatG] = useState('5');
  const [zincMg, setZincMg] = useState('1.5');
  const [magnesiumMg, setMagnesiumMg] = useState('45');
  const [nitratesMg, setNitratesMg] = useState('20');
  const [pathway, setPathway] = useState<HormonalPathway>('Testosterone & Steroidogenesis');
  const [sourceNote, setSourceNote] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Ingredient name is required.');
      return;
    }

    const p = Math.max(0, Number(proteinG) || 0);
    const c = Math.max(0, Number(carbsG) || 0);
    const f = Math.max(0, Number(fatG) || 0);
    const price = Math.max(0, Number(pricePer100g) || 0);

    const trimmedUrl = customUrl.trim();
    let validatedUrl: string | undefined;
    if (trimmedUrl) {
      const parsed = sanitizeExternalUrl(trimmedUrl);
      if (!parsed) {
        setError('Purchase / affiliate link must start with https:// or http://.');
        return;
      }
      validatedUrl = parsed;
    }

    const newFood: WholeFood = {
      id: `custom_${Date.now()}`,
      name: trimmedName,
      localName: localName.trim() || trimmedName,
      marketChannel,
      hyderabadSourceNote: sourceNote.trim() || `Local ${region.shortLabel} market`,
      pricePer100gInr: price,
      per100g: {
        calories: Math.round(p * 4 + c * 4 + f * 9),
        proteinG: p,
        carbsG: c,
        fatG: f,
        fiberG: 2,
        zincMg: Math.max(0, Number(zincMg) || 0),
        magnesiumMg: Math.max(0, Number(magnesiumMg) || 0),
        seleniumMcg: 5,
        nitratesMg: Math.max(0, Number(nitratesMg) || 0),
      },
      primaryPathway: pathway,
      bioactiveMechanism:
        mechanism.trim() || 'User-added local whole food supporting whole-body hormonal & metabolic health.',
      prepTip: 'Prep fresh or batch-portion to fit your daily macro targets.',
      isCustom: true,
    };

    onAddFood(newFood, validatedUrl);
    setName('');
    setLocalName('');
    setSourceNote('');
    setMechanism('');
    setCustomUrl('');
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-food-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500">{region.label} · Values per 100g</p>
            <h2 id="custom-food-title" className="font-display text-base font-semibold text-slate-900">
              Add Local Whole Food & Link
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add local food dialog"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block font-medium text-slate-700 mb-1">Ingredient Name *</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wild Sardines / Horse Gram"
                className="w-full px-3 py-2 min-h-[38px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </label>

            <label className="block">
              <span className="block font-medium text-slate-700 mb-1">Local / Market Name</span>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="e.g. Ulavalu / Mathi"
                className="w-full px-3 py-2 min-h-[38px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block font-medium text-slate-700 mb-1">Local Market Channel</span>
              <select
                value={marketChannel}
                onChange={(e) => setMarketChannel(e.target.value as MarketChannel)}
                className="w-full px-3 py-2 min-h-[38px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {region.marketChannelLabels[ch]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block font-medium text-slate-700 mb-1">
                Price per 100g ({region.currencySymbol})
              </span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={pricePer100g}
                onChange={(e) => setPricePer100g(e.target.value)}
                className="w-full px-3 py-2 min-h-[38px] font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Protein (g)', val: proteinG, set: setProteinG },
              { label: 'Carbs (g)', val: carbsG, set: setCarbsG },
              { label: 'Fat (g)', val: fatG, set: setFatG },
              { label: 'Zinc (mg)', val: zincMg, set: setZincMg },
              { label: 'Mg (mg)', val: magnesiumMg, set: setMagnesiumMg },
              { label: 'NO3 (mg)', val: nitratesMg, set: setNitratesMg },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="block text-[11px] text-slate-600 mb-1">{field.label}</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={field.val}
                  onChange={(e) => field.set(e.target.value)}
                  className="w-full px-2 py-1.5 font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="block font-medium text-slate-700 mb-1">Primary Hormonal Pathway</span>
            <select
              value={pathway}
              onChange={(e) => setPathway(e.target.value as HormonalPathway)}
              className="w-full px-3 py-2 min-h-[38px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
            >
              {PATHWAYS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block font-medium text-slate-700 mb-1">
              Local Sourcing Note ({region.shortLabel})
            </span>
            <input
              type="text"
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              placeholder="e.g. Available fresh at morning market or local co-op"
              className="w-full px-3 py-2 min-h-[38px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </label>

          <label className="block">
            <span className="block font-medium text-slate-700 mb-1">
              Affiliate / Store Link URL (Optional)
            </span>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://amzn.to/... or store product URL"
              className="w-full px-3 py-2 min-h-[38px] font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 min-h-[40px] font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Add Whole Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
