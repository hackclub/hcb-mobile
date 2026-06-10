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

let bundledData: BundledData;
try {
  bundledData = require("./data.json");
} catch {
  bundledData = {
    merchants: [],
    categories: {},
    bundledAt: "",
    fallback: true,
  };
}

const data = bundledData;

const merchantsByNetworkId = new Map<string, MerchantData>();
const merchantsByName = new Map<string, MerchantData>();

for (const merchant of data.merchants) {
  for (const networkId of merchant.network_ids) {
    merchantsByNetworkId.set(networkId, merchant);
  }
  if (merchant.name) {
    merchantsByName.set(merchant.name.toLowerCase(), merchant);
  }
}

export class Merchant {
  private data: MerchantData | null = null;

  private constructor(merchantData: MerchantData | null) {
    this.data = merchantData;
  }

  static lookup(options: { networkId?: string; name?: string }): Merchant {
    let merchantData: MerchantData | null = null;

    if (options.networkId) {
      merchantData = merchantsByNetworkId.get(options.networkId) || null;
    } else if (options.name) {
      merchantData = merchantsByName.get(options.name.toLowerCase()) || null;
    }

    return new Merchant(merchantData);
  }

  inDataset(): boolean {
    return this.data !== null;
  }

  getName(): string | undefined {
    return this.data?.name;
  }

  getIcon(): string | undefined {
    return this.data?.icon ?? undefined;
  }

  getNetworkIds(): string[] {
    return this.data?.network_ids || [];
  }
}

export class Category {
  private key: string;
  private data: CategoryData | null = null;

  private constructor(key: string, categoryData: CategoryData | null) {
    this.key = key;
    this.data = categoryData;
  }

  static lookup(options: { key: string }): Category {
    const categoryData = data.categories[options.key] || null;
    return new Category(options.key, categoryData);
  }

  inDataset(): boolean {
    return this.data !== null;
  }

  getName(): string | undefined {
    return this.data?.name;
  }

  getKey(): string {
    return this.key;
  }
}

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
