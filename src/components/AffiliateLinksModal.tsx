import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search, Store, Trash2, X } from 'lucide-react';
import {
  STORE_PLATFORMS,
  buildIngredientPurchaseLink,
  sanitizeExternalUrl,
} from '../utils/links';
import type { AffiliateLinkConfig, StorePlatform, WholeFood } from '../types/nutrition';

interface AffiliateLinksModalProps {
  isOpen: boolean;
  foods: WholeFood[];
  config: AffiliateLinkConfig;
  initialFocusFoodId?: string | null;
  onUpdateConfig: (next: AffiliateLinkConfig) => void;
  onClose: () => void;
}

export function AffiliateLinksModal({
  isOpen,
  foods,
  config,
  initialFocusFoodId,
  onUpdateConfig,
  onClose,
}: AffiliateLinksModalProps) {
  const [search, setSearch] = useState('');
  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setDraftUrls(config.customUrls);
    if (initialFocusFoodId) {
      const target = foods.find((f) => f.id === initialFocusFoodId);
      if (target) setSearch(target.name);
    } else {
      setSearch('');
    }
  }, [isOpen, initialFocusFoodId, config.customUrls, foods]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || f.localName.toLowerCase().includes(q)
    );
  }, [foods, search]);

  if (!isOpen) return null;

  const selectedPlatform = STORE_PLATFORMS[config.storePlatform] ?? STORE_PLATFORMS.amazon_in;

  const handleSaveCustomUrl = (foodId: string, rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      const next = { ...config.customUrls };
      delete next[foodId];
      onUpdateConfig({ ...config, customUrls: next });
      return;
    }
    const sanitized = sanitizeExternalUrl(trimmed);
    if (sanitized) {
      onUpdateConfig({
        ...config,
        customUrls: { ...config.customUrls, [foodId]: sanitized },
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="affiliate-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500">
              Native Store Handoff · Local Preferences Saved on Device
            </p>
            <h2
              id="affiliate-modal-title"
              className="font-display text-base font-semibold text-slate-900"
            >
              Preferred Grocery Store & Direct Product Links
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferred grocery store dialog"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Storefront Selection (Consumer-safe, Creator Tag Protected) */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1">
                <Store className="w-3.5 h-3.5 text-teal-700" />
                <span>Preferred Grocery Store</span>
              </span>
              <select
                value={config.storePlatform}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    storePlatform: e.target.value as StorePlatform,
                  })
                }
                className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
              >
                {Object.values(STORE_PLATFORMS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2 min-h-[40px]">
              <span className="text-xs text-slate-700 font-medium">
                {selectedPlatform.id === 'amazon_in'
                  ? 'Amazon.in Partner Link Active'
                  : `${selectedPlatform.label.split(' ')[0]} Quick Search Active`}
              </span>
              <span className="font-mono tabular-nums text-[11px] text-slate-500">
                {Object.keys(config.customUrls).length} direct URLs
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            As an Amazon Associate I earn from qualifying purchases. Outbound ingredient links launch cleanly in your browser or shopping app (never inside an embedded WebView). You can optionally pin your favorite local brand URL per item below.
          </p>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter ingredients to preview or pin a direct URL..."
              aria-label="Filter ingredients in store preferences"
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        {/* Ingredient Link Rows */}
        <div className="overflow-y-auto divide-y divide-slate-200">
          {filteredFoods.map((food) => {
            const draft = draftUrls[food.id] ?? '';
            const hasDraftError = draft.trim().length > 0 && sanitizeExternalUrl(draft) === null;
            const resolved = buildIngredientPurchaseLink(food, config);

            return (
              <div key={food.id} className="px-5 py-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-900">{food.name}</span>
                    <span className="text-xs text-slate-500"> · {food.localName}</span>
                  </div>
                  <a
                    href={resolved.url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 underline-offset-2 hover:underline"
                  >
                    <span>Open {resolved.sourceLabel}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={draft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftUrls((prev) => ({ ...prev, [food.id]: val }));
                      if (val.trim() === '' || sanitizeExternalUrl(val) !== null) {
                        handleSaveCustomUrl(food.id, val);
                      }
                    }}
                    placeholder="Optional direct product URL (https://...)"
                    aria-label={`Custom product URL for ${food.name}`}
                    className={`flex-1 px-3 py-1.5 min-h-[38px] text-xs font-mono bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                      hasDraftError
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-slate-300 focus:border-teal-700'
                    }`}
                  />
                  {draft.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftUrls((prev) => ({ ...prev, [food.id]: '' }));
                        handleSaveCustomUrl(food.id, '');
                      }}
                      aria-label={`Clear custom URL for ${food.name}`}
                      className="p-2 min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {hasDraftError && (
                  <p className="text-[11px] text-red-700">
                    Enter a valid http:// or https:// URL to save.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
