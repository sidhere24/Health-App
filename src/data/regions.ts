import type {
  AgeGroupId,
  BiologicalSex,
  LocationId,
  MarketChannel,
  StorePlatform,
  WeightClassId,
  WholeFood,
} from '../types/nutrition';

export interface AgeGroupPreset {
  id: AgeGroupId;
  label: string;
  defaultAge: number;
  proteinBonusGPerKg: number;
  zincMg: number;
  magnesiumMg: number;
  seleniumMcg: number;
  nitratesMg: number;
  guidanceNote: string;
}

export interface WeightClassPreset {
  id: WeightClassId;
  label: string;
  rangeLabel: string;
  defaultWeightKg: number;
  recommendedPortionScale: number;
}

export interface RegionFoodOverride {
  localName?: string;
  sourceNote?: string;
  pricePer100g?: number;
}

export interface RegionConfig {
  id: LocationId;
  label: string;
  shortLabel: string;
  currencySymbol: string;
  currencyCode: string;
  defaultDailyBudget: number;
  minBudget: number;
  maxBudget: number;
  budgetStep: number;
  /** Multiplier applied to Hyderabad INR base prices when no explicit override exists */
  priceMultiplierFromInr: number;
  defaultStorePlatform: StorePlatform;
  marketChannelLabels: Record<MarketChannel, string>;
  /** Metric regions show grams/kg; imperial regions show oz/lb (US, UK). */
  weightSystem: 'metric' | 'imperial';
  foodOverrides: Record<string, RegionFoodOverride>;
  localNote: string;
}

export const AGE_GROUPS: AgeGroupPreset[] = [
  {
    id: '18-25',
    label: '18–25 yrs · Foundation & Growth',
    defaultAge: 22,
    proteinBonusGPerKg: 0,
    zincMg: 13,
    magnesiumMg: 400,
    seleniumMcg: 60,
    nitratesMg: 300,
    guidanceNote: 'Supports active energy throughput, training recovery, and foundational metabolic health.',
  },
  {
    id: '26-35',
    label: '26–35 yrs · Active Prime',
    defaultAge: 32,
    proteinBonusGPerKg: 0,
    zincMg: 14,
    magnesiumMg: 420,
    seleniumMcg: 65,
    nitratesMg: 320,
    guidanceNote: 'Balances daily stress resilience, reproductive minerals, and healthy circulation.',
  },
  {
    id: '36-45',
    label: '36–45 yrs · Midlife Balance',
    defaultAge: 40,
    proteinBonusGPerKg: 0.08,
    zincMg: 15,
    magnesiumMg: 430,
    seleniumMcg: 70,
    nitratesMg: 350,
    guidanceNote: 'Prioritizes lean muscle protection, mineral adequacy, and vascular elasticity.',
  },
  {
    id: '46-60',
    label: '46–60 yrs · Strength & Longevity',
    defaultAge: 52,
    proteinBonusGPerKg: 0.15,
    zincMg: 15,
    magnesiumMg: 440,
    seleniumMcg: 75,
    nitratesMg: 380,
    guidanceNote: 'Higher leucine-rich protein counters age-related muscle loss while supporting heart & hormone balance.',
  },
  {
    id: '60+',
    label: '60+ yrs · Vital Aging',
    defaultAge: 64,
    proteinBonusGPerKg: 0.2,
    zincMg: 15,
    magnesiumMg: 440,
    seleniumMcg: 75,
    nitratesMg: 400,
    guidanceNote: 'Focuses on easy-to-digest protein, bone & muscle preservation, and nitrate-rich blood flow foods.',
  },
];

export const WEIGHT_CLASSES: WeightClassPreset[] = [
  {
    id: 'light',
    label: 'Light (< 65 kg)',
    rangeLabel: '50–64 kg',
    defaultWeightKg: 60,
    recommendedPortionScale: 0.75,
  },
  {
    id: 'middle',
    label: 'Middle (65–80 kg)',
    rangeLabel: '65–79 kg',
    defaultWeightKg: 72,
    recommendedPortionScale: 0.9,
  },
  {
    id: 'cruiser',
    label: 'Cruiser (80–95 kg)',
    rangeLabel: '80–94 kg',
    defaultWeightKg: 85,
    recommendedPortionScale: 1.0,
  },
  {
    id: 'heavy',
    label: 'Heavy (95+ kg)',
    rangeLabel: '95–125 kg',
    defaultWeightKg: 102,
    recommendedPortionScale: 1.25,
  },
];

export const REGIONS: Record<LocationId, RegionConfig> = {
  hyderabad: {
    id: 'hyderabad',
    label: 'Hyderabad, Telangana',
    shortLabel: 'Hyderabad',
    currencySymbol: '₹',
    currencyCode: 'INR',
    defaultDailyBudget: 300,
    minBudget: 180,
    maxBudget: 500,
    budgetStep: 10,
    priceMultiplierFromInr: 1,
    defaultStorePlatform: 'amazon_in',
    marketChannelLabels: {
      'Rythu Bazaar · Produce': 'Rythu Bazaar · Produce',
      'Begum Bazaar · Seeds & Grains': 'Begum Bazaar · Seeds & Grains',
      'Local Poultry, Fish & Butcher': 'Local Poultry, Fish & Butcher',
      'Dairy & Eggs': 'Dairy & Eggs',
    },
    weightSystem: 'metric',
    foodOverrides: {},
    localNote: 'Erragadda / Mehdipatnam Rythu Bazaars, Begum Bazaar wholesale & local Telangana markets.',
  },
  bengaluru: {
    id: 'bengaluru',
    label: 'Bengaluru, Karnataka',
    shortLabel: 'Bengaluru',
    currencySymbol: '₹',
    currencyCode: 'INR',
    defaultDailyBudget: 340,
    minBudget: 200,
    maxBudget: 550,
    budgetStep: 10,
    priceMultiplierFromInr: 1.12,
    defaultStorePlatform: 'bigbasket',
    marketChannelLabels: {
      'Rythu Bazaar · Produce': 'HOPCOMS / KR Market · Produce',
      'Begum Bazaar · Seeds & Grains': 'Chickpet / Kirana · Seeds & Grains',
      'Local Poultry, Fish & Butcher': 'Russel Market / Local Meat & Fish',
      'Dairy & Eggs': 'Nandini Dairy & Eggs',
    },
    weightSystem: 'metric',
    foodOverrides: {
      moringa_leaves: {
        localName: 'Nugge Soppu (Drumstick Leaves)',
        sourceNote: 'HOPCOMS & morning soppu carts ₹45–₹65/kg',
      },
      ragi_jowar: {
        localName: 'Ragi Hittu (Finger Millet Flour)',
        sourceNote: 'Karnataka chakki mills & APMC Yeshwanthpur ₹45–₹55/kg',
      },
      curd_dahi: {
        localName: 'Nandini Mosaru / Curd',
        sourceNote: 'Nandini Milk Parlours ₹52–₹60/L',
        pricePer100g: 6.0,
      },
      bangda_mackerel: {
        localName: 'Bangda / Ayala Fish',
        sourceNote: 'Mangalore fresh catch at Shivajinagar / Madiwala ₹260–₹300/kg',
        pricePer100g: 28.0,
      },
    },
    localNote: 'HOPCOMS produce stalls, Nandini parlours, Yeshwanthpur APMC & coastal Mangalore fish.',
  },
  mumbai: {
    id: 'mumbai',
    label: 'Mumbai / Pune, Maharashtra',
    shortLabel: 'Mumbai / Pune',
    currencySymbol: '₹',
    currencyCode: 'INR',
    defaultDailyBudget: 360,
    minBudget: 220,
    maxBudget: 600,
    budgetStep: 10,
    priceMultiplierFromInr: 1.18,
    defaultStorePlatform: 'blinkit',
    marketChannelLabels: {
      'Rythu Bazaar · Produce': 'APMC Vashi / Local Bhaji Market',
      'Begum Bazaar · Seeds & Grains': 'Crawford / APMC Masala & Grains',
      'Local Poultry, Fish & Butcher': 'Sassoon Dock / Coastal Fish & Poultry',
      'Dairy & Eggs': 'Gokul / Amul Dairy & Eggs',
    },
    weightSystem: 'metric',
    foodOverrides: {
      ragi_jowar: {
        localName: 'Nachni / Jowar Bhakri Flour',
        sourceNote: 'Local flour mills & APMC Vashi ₹55–₹68/kg',
      },
      bangda_mackerel: {
        localName: 'Fresh Bangda (Coastal Mackerel)',
        sourceNote: 'Sassoon Dock / Versova / Dadar fish market ₹220–₹260/kg',
        pricePer100g: 24.0,
      },
      moringa_leaves: {
        localName: 'Shevgyachya Pala (Drumstick Leaves)',
        sourceNote: 'Morning vegetable stalls ₹50–₹70/kg',
      },
    },
    localNote: 'Sassoon Dock coastal mackerel, APMC Vashi wholesale grains & local bhaji mandis.',
  },
  delhi: {
    id: 'delhi',
    label: 'Delhi NCR, North India',
    shortLabel: 'Delhi NCR',
    currencySymbol: '₹',
    currencyCode: 'INR',
    defaultDailyBudget: 320,
    minBudget: 200,
    maxBudget: 550,
    budgetStep: 10,
    priceMultiplierFromInr: 1.08,
    defaultStorePlatform: 'amazon_in',
    marketChannelLabels: {
      'Rythu Bazaar · Produce': 'Safal / Azadpur Mandi · Produce',
      'Begum Bazaar · Seeds & Grains': 'Khari Baoli / Kirana · Seeds & Grains',
      'Local Poultry, Fish & Butcher': 'INA / Ghazipur Poultry & Fish',
      'Dairy & Eggs': 'Mother Dairy / Amul & Eggs',
    },
    weightSystem: 'metric',
    foodOverrides: {
      ragi_jowar: {
        localName: 'Bajra / Jowar Atta',
        sourceNote: 'Local chakki & Khari Baoli ₹50–₹62/kg',
      },
      moringa_leaves: {
        localName: 'Sahjan Patta / Methi-Sarson Greens',
        sourceNote: 'Safal & seasonal mandi greens ₹40–₹60/kg',
      },
      walnuts: {
        localName: 'Kashmiri Akhrot Giris',
        sourceNote: 'Khari Baoli wholesale dry fruit market ₹720–₹800/kg',
        pricePer100g: 75.0,
      },
    },
    localNote: 'Safal outlets, Mother Dairy booths, Khari Baoli dry fruits & INA poultry/fish.',
  },
  usa: {
    id: 'usa',
    label: 'United States (National)',
    shortLabel: 'United States',
    currencySymbol: '$',
    currencyCode: 'USD',
    defaultDailyBudget: 14,
    minBudget: 8,
    maxBudget: 30,
    budgetStep: 1,
    priceMultiplierFromInr: 0.032,
    defaultStorePlatform: 'amazon_com',
    marketChannelLabels: {
      'Rythu Bazaar · Produce': 'Farmers Market / Produce Aisle',
      'Begum Bazaar · Seeds & Grains': 'Bulk Co-op · Seeds & Grains',
      'Local Poultry, Fish & Butcher': 'Butcher & Seafood Counter',
      'Dairy & Eggs': 'Dairy, Yogurt & Eggs',
    },
    weightSystem: 'imperial',
    foodOverrides: {
      whole_eggs: {
        localName: 'Pasture / Cage-Free Whole Eggs',
        sourceNote: 'Bulk 24–36 egg packs at Costco / Aldi / Kroger ~$3.50/doz',
        pricePer100g: 0.58,
      },
      chicken_breast: {
        localName: 'Boneless Skinless Chicken Breast',
        sourceNote: 'Value family pack $3.20–$4.20/lb',
        pricePer100g: 0.82,
      },
      chicken_thigh: {
        localName: 'Boneless Chicken Thighs',
        sourceNote: 'Budget family pack $2.60–$3.30/lb',
        pricePer100g: 0.65,
      },
      bangda_mackerel: {
        localName: 'Atlantic / Pacific Mackerel or Sardines',
        sourceNote: 'Frozen fillets or canned in water $3.80–$5.00/lb',
        pricePer100g: 0.95,
      },
      rohu_fish: {
        localName: 'Wild Whitefish / Tilapia / Trout',
        sourceNote: 'Frozen bulk fillets ~$3.50/lb',
        pricePer100g: 0.78,
      },
      paneer: {
        localName: 'Firm Cottage Cheese / Queso Fresco / Paneer',
        sourceNote: 'Local supermarket or Indian grocer ~$3.80/lb',
        pricePer100g: 0.85,
      },
      curd_dahi: {
        localName: 'Plain Whole-Milk Greek / Live Yogurt',
        sourceNote: '32oz tub at Aldi / Trader Joe’s ~$3.20',
        pricePer100g: 0.35,
      },
      sona_masoori: {
        localName: 'Long-Grain Jasmine / Parboiled Rice',
        sourceNote: '10lb bulk bag ~$1.10/lb',
        pricePer100g: 0.24,
      },
      ragi_jowar: {
        localName: 'Whole Millet / Buckwheat / Whole Wheat Flour',
        sourceNote: 'Bulk grain aisle or sprouted flatbreads',
        pricePer100g: 0.35,
      },
      moringa_leaves: {
        localName: 'Baby Kale / Arugula / Moringa Powder',
        sourceNote: 'Produce clamshell or ethnic grocer ~$3.00/bag',
        pricePer100g: 0.7,
      },
      pumpkin_seeds: {
        localName: 'Raw Hulled Pepitas (Pumpkin Seeds)',
        sourceNote: 'Bulk bins / Costco / Amazon ~$5.50/lb',
        pricePer100g: 1.25,
      },
      beetroot: {
        localName: 'Fresh Red Beets',
        sourceNote: 'Produce bunch ~$1.80/lb',
        pricePer100g: 0.4,
      },
      pomegranate: {
        localName: 'Pomegranate Arils / Whole Fruit',
        sourceNote: 'Seasonal whole fruit or cups ~$3.50/lb',
        pricePer100g: 0.85,
      },
    },
    localNote: 'Budget US grocery staples (Costco, Aldi, Trader Joe’s, local farmers markets).',
  },
  uk: {
    id: 'uk',
    label: 'United Kingdom',
    shortLabel: 'United Kingdom',
    currencySymbol: '£',
    currencyCode: 'GBP',
    defaultDailyBudget: 10,
    minBudget: 6,
    maxBudget: 24,
    budgetStep: 1,
    priceMultiplierFromInr: 0.024,
    defaultStorePlatform: 'amazon_co_uk',
    marketChannelLabels: {
      'Rythu Bazaar · Produce': 'Greengrocer / Veg Market',
      'Begum Bazaar · Seeds & Grains': 'Wholefoods & Bulk Grains',
      'Local Poultry, Fish & Butcher': 'Local Butcher & Fishmonger',
      'Dairy & Eggs': 'Dairy, Kefir & Eggs',
    },
    weightSystem: 'imperial',
    foodOverrides: {
      whole_eggs: {
        localName: 'Free-Range Whole Eggs',
        sourceNote: '15-pack boxes at Aldi / Lidl / Tesco ~£2.60',
        pricePer100g: 0.35,
      },
      bangda_mackerel: {
        localName: 'Fresh / Smoked Atlantic Mackerel',
        sourceNote: 'Fishmonger or supermarket chilled fillets ~£6.50/kg',
        pricePer100g: 0.65,
      },
      curd_dahi: {
        localName: 'Live Natural Yogurt / Kefir',
        sourceNote: '500g–1kg pots ~£1.60/kg',
        pricePer100g: 0.16,
      },
      moringa_leaves: {
        localName: 'Cavolo Nero / Watercress / Spinach',
        sourceNote: 'UK supermarkets & greengrocers ~£4.00/kg',
        pricePer100g: 0.4,
      },
    },
    localNote: 'UK local markets, fishmongers, Aldi/Lidl staples, and wholefood co-ops.',
  },
};

export function getAgeGroupForAge(age: number): AgeGroupPreset {
  if (age <= 25) return AGE_GROUPS[0];
  if (age <= 35) return AGE_GROUPS[1];
  if (age <= 45) return AGE_GROUPS[2];
  if (age <= 60) return AGE_GROUPS[3];
  return AGE_GROUPS[4];
}

export function getAgeGuidanceForSex(age: number, sex: BiologicalSex = 'neutral'): string {
  const group = getAgeGroupForAge(age);
  if (sex === 'female') {
    switch (group.id) {
      case '18-25':
        return 'Supports steady energy, iron-friendly whole foods, cycle resilience, and active recovery.';
      case '26-35':
        return 'Balances thyroid & reproductive minerals, calm cortisol, and consistent lean protein.';
      case '36-45':
        return 'Supports hormonal steadiness, bone-friendly magnesium, and lean muscle preservation.';
      case '46-60':
        return 'Boosts leucine-rich protein and magnesium to protect bone density, sleep, and perimenopause/menopause balance.';
      case '60+':
        return 'Prioritizes gentle, protein-rich meals for bone strength, mobility, and cardiovascular blood flow.';
    }
  }
  return group.guidanceNote;
}

export function getWeightClassForWeight(weightKg: number): WeightClassPreset {
  if (weightKg < 65) return WEIGHT_CLASSES[0];
  if (weightKg < 80) return WEIGHT_CLASSES[1];
  if (weightKg < 95) return WEIGHT_CLASSES[2];
  return WEIGHT_CLASSES[3];
}

export function localizeWholeFood(food: WholeFood, locationId: LocationId): WholeFood {
  if (food.isCustom) return food;
  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const override = region.foodOverrides[food.id];
  const localizedPrice =
    override?.pricePer100g ??
    Math.round(food.pricePer100gInr * region.priceMultiplierFromInr * 100) / 100;

  const fallbackSourceNote =
    locationId === 'hyderabad'
      ? food.hyderabadSourceNote
      : `${region.marketChannelLabels[food.marketChannel]} · Local ${region.shortLabel} staple`;

  return {
    ...food,
    localName: override?.localName ?? food.localName,
    hyderabadSourceNote: override?.sourceNote ?? fallbackSourceNote,
    pricePer100gInr: localizedPrice,
  };
}
