declare const data: {
  merchants: Array<{
    name: string;
    network_ids: string[];
    icon: string | null;
    website: string | null;
  }>;
  categories: Record<string, { name: string }>;
  bundledAt: string;
  fallback?: boolean;
};

export default data;
