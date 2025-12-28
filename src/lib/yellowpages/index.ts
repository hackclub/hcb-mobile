/**
 * Embedded yellowpages implementation that uses bundled data
 * instead of fetching from GitHub at runtime.
 *
 * This prevents fetch failures in regions where GitHub is blocked (e.g., China)
 * and makes the data available offline immediately.
 *
 * The data is bundled during:
 * - npm install (postinstall hook)
 * - EAS builds (pre-build hook)
 * - Expo updates (before publish)
 */

interface MerchantData {
  name: string;
  network_ids: string[];
  icon: string | null;
  website: string | null;
}

interface CategoryData {
  name: string;
}

interface BundledData {
  merchants: MerchantData[];
  categories: Record<string, CategoryData>;
  bundledAt: string;
  fallback?: boolean;
}

// Use require for runtime loading with fallback for when data.json doesn't exist yet
// eslint-disable-next-line @typescript-eslint/no-var-requires
let bundledData: BundledData;
try {
  bundledData = require("./data.json");
} catch {
  // Fallback for when data.json hasn't been generated yet (e.g., fresh clone before npm install)
  bundledData = {
    merchants: [],
    categories: {},
    bundledAt: "",
    fallback: true,
  };
}

const data = bundledData;

// Build lookup maps for O(1) access
const merchantsByNetworkId = new Map<string, MerchantData>();
const merchantsByName = new Map<string, MerchantData>();

for (const merchant of data.merchants) {
  // Index by all network IDs
  for (const networkId of merchant.network_ids) {
    merchantsByNetworkId.set(networkId, merchant);
  }
  // Index by name (lowercase for case-insensitive lookup)
  if (merchant.name) {
    merchantsByName.set(merchant.name.toLowerCase(), merchant);
  }
}

/**
 * Merchant class - compatible with @thedev132/yellowpages API
 */
export class Merchant {
  private data: MerchantData | null = null;

  private constructor(merchantData: MerchantData | null) {
    this.data = merchantData;
  }

  /**
   * Look up a merchant by network ID or name
   */
  static lookup(options: { networkId?: string; name?: string }): Merchant {
    let merchantData: MerchantData | null = null;

    if (options.networkId) {
      merchantData = merchantsByNetworkId.get(options.networkId) || null;
    } else if (options.name) {
      merchantData = merchantsByName.get(options.name.toLowerCase()) || null;
    }

    return new Merchant(merchantData);
  }

  /**
   * Check if this merchant exists in the dataset
   */
  inDataset(): boolean {
    return this.data !== null;
  }

  /**
   * Get the merchant's display name
   */
  getName(): string | undefined {
    return this.data?.name;
  }

  /**
   * Get the merchant's icon URL
   */
  getIcon(): string | undefined {
    return this.data?.icon ?? undefined;
  }

  /**
   * Get the merchant's network IDs
   */
  getNetworkIds(): string[] {
    return this.data?.network_ids || [];
  }
}

/**
 * Category class - compatible with @thedev132/yellowpages API
 */
export class Category {
  private key: string;
  private data: CategoryData | null = null;

  private constructor(key: string, categoryData: CategoryData | null) {
    this.key = key;
    this.data = categoryData;
  }

  /**
   * Look up a category by key (MCC code)
   */
  static lookup(options: { key: string }): Category {
    const categoryData = data.categories[options.key] || null;
    return new Category(options.key, categoryData);
  }

  /**
   * Check if this category exists in the dataset
   */
  inDataset(): boolean {
    return this.data !== null;
  }

  /**
   * Get the category's display name
   */
  getName(): string | undefined {
    return this.data?.name;
  }

  /**
   * Get the category key (MCC code)
   */
  getKey(): string {
    return this.key;
  }
}

/**
 * Get information about the bundled data
 */
export function getBundleInfo(): {
  merchantCount: number;
  categoryCount: number;
  bundledAt: string;
  isFallback: boolean;
} {
  return {
    merchantCount: data.merchants.length,
    categoryCount: Object.keys(data.categories).length,
    bundledAt: data.bundledAt,
    isFallback: data.fallback ?? false,
  };
}
