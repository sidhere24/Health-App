import type { AffiliateLinkConfig, StorePlatform, WholeFood } from '../types/nutrition';

export interface StorePlatformMeta {
  id: StorePlatform;
  label: string;
  supportsAmazonTag: boolean;
  buildSearchUrl: (query: string, affiliateTag?: string) => string;
}

/**
 * Clean, high-converting storefront search queries free of slashes or prep adjectives
 * that otherwise trigger poor or empty Amazon Fresh / Pantry search results.
 */
export const CLEAN_STORE_QUERIES: Record<string, string> = {
  whole_eggs: 'fresh farm eggs 30 pack',
  chicken_breast: 'fresh boneless chicken breast 500g',
  chicken_thigh: 'fresh chicken curry cut 500g',
  bangda_mackerel: 'indian mackerel bangda fish fresh',
  rohu_fish: 'fresh rohu fish curry cut',
  paneer: 'fresh malai paneer 200g',
  curd_dahi: 'fresh thick dahi curd 400g',
  pumpkin_seeds: 'raw green pumpkin seeds 500g',
  black_sesame: 'organic black sesame seeds til 500g',
  walnuts: 'kashmiri walnut kernels akhrot 500g',
  peanuts: 'raw red peanuts groundnut 1kg',
  soya_chunks: 'soya chunks high protein 1kg',
  kala_chana: 'desi kala chana 1kg',
  moong_dal: 'whole green moong dal 1kg',
  moringa_leaves: 'fresh moringa drumstick leaves',
  spinach: 'fresh palak spinach leaves',
  beetroot: 'fresh red beetroot 500g',
  watermelon: 'fresh red watermelon',
  pomegranate: 'fresh anar pomegranate',
  banana: 'fresh bananas',
  sweet_potato: 'fresh sweet potato 500g',
  garlic_ginger: 'fresh garlic ginger',
  sona_masoori: 'unpolished sona masoori rice 5kg',
  ragi_jowar: 'organic ragi finger millet flour 1kg',
  rolled_oats: 'whole grain rolled oats 1kg',
  cow_ghee: 'pure desi cow ghee 500ml',
  groundnut_oil: 'cold pressed groundnut oil 1 litre',
};

export function getCleanProductQuery(food: WholeFood): string {
  if (CLEAN_STORE_QUERIES[food.id]) {
    return CLEAN_STORE_QUERIES[food.id];
  }
  return food.name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
}

export const STORE_PLATFORMS: Record<StorePlatform, StorePlatformMeta> = {
  amazon_in: {
    id: 'amazon_in',
    label: 'Amazon.in (Fresh / Pantry)',
    supportsAmazonTag: true,
    buildSearchUrl: (query, affiliateTag) => {
      const base = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
      const tag = affiliateTag?.trim();
      return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
    },
  },
  bigbasket: {
    id: 'bigbasket',
    label: 'BigBasket (India)',
    supportsAmazonTag: false,
    buildSearchUrl: (query) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}`,
  },
  blinkit: {
    id: 'blinkit',
    label: 'Blinkit (Instant Delivery)',
    supportsAmazonTag: false,
    buildSearchUrl: (query) => `https://blinkit.com/s/?q=${encodeURIComponent(query)}`,
  },
  amazon_com: {
    id: 'amazon_com',
    label: 'Amazon.com (US)',
    supportsAmazonTag: true,
    buildSearchUrl: (query, affiliateTag) => {
      const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
      const tag = affiliateTag?.trim();
      // Do not pass India -21 tags directly to US amazon.com searches
      return tag && !tag.endsWith('-21') ? `${base}&tag=${encodeURIComponent(tag)}` : base;
    },
  },
  amazon_co_uk: {
    id: 'amazon_co_uk',
    label: 'Amazon.co.uk (UK)',
    supportsAmazonTag: true,
    buildSearchUrl: (query, affiliateTag) => {
      const base = `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}`;
      const tag = affiliateTag?.trim();
      return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
    },
  },
};

export function sanitizeExternalUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export interface ResolvedIngredientLink {
  url: string;
  isCustom: boolean;
  isAffiliateTagged: boolean;
  sourceLabel: string;
}

export function buildIngredientPurchaseLink(
  food: WholeFood,
  config: AffiliateLinkConfig
): ResolvedIngredientLink {
  const customRaw = config.customUrls[food.id];
  const validCustom = customRaw ? sanitizeExternalUrl(customRaw) : null;
  if (validCustom) {
    return {
      url: validCustom,
      isCustom: true,
      isAffiliateTagged: true,
      sourceLabel: 'Direct Link',
    };
  }

  const platform = STORE_PLATFORMS[config.storePlatform] ?? STORE_PLATFORMS.amazon_in;
  const tag = config.affiliateTag.trim();
  const isTagApplied =
    platform.supportsAmazonTag &&
    tag.length > 0 &&
    !(platform.id === 'amazon_com' && tag.endsWith('-21'));

  const cleanQuery = getCleanProductQuery(food);

  return {
    url: platform.buildSearchUrl(cleanQuery, tag),
    isCustom: false,
    isAffiliateTagged: isTagApplied,
    sourceLabel: isTagApplied
      ? `${platform.label.split(' ')[0]} · Tagged`
      : platform.label.split(' ')[0],
  };
}
