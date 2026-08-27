import { create } from "zustand";

export interface Spec {
  label: string;
  value: string;
  category: string;
  unit?: string;
  numericValue?: number;
  isWinner?: boolean;
  isDraw?: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  retailer: string;
  retailerColor: string;
  price?: string;
  url: string;
  imageUrl?: string | null;
  specs: Spec[];
  aiSummary?: string;
  badges?: string[];
}

export interface ComparisonResult {
  id: string;
  products: Product[];
  keyDifferences: Array<{ label: string; values: string[] }>;
  aiSummary: string;
  createdAt: string;
}

export interface Comparison {
  id: string;
  title: string;
  date: string;
  urls: string[];
  result?: ComparisonResult;
}

interface ComparisonStore {
  urls: string[];
  isLoading: boolean;
  loadingMessage: string;
  activeComparison: ComparisonResult | null;
  recentComparisons: Comparison[];
  updateUrl: (index: number, url: string) => void;
  addUrl: () => void;
  removeUrl: (index: number) => void;
  setUrls: (urls: string[]) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setActiveComparison: (result: ComparisonResult | null) => void;
  addRecentComparison: (comparison: Comparison) => void;
}

const MOCK_RESULT: ComparisonResult = {
  id: "mock",
  products: [
    {
      id: "p1",
      name: "iPhone 15 Pro",
      brand: "Apple",
      retailer: "bestbuy",
      retailerColor: "#003B64",
      url: "https://www.bestbuy.ca/iphone15pro",
      specs: [
        { label: "Processor", value: "A17 Pro", category: "Performance" },
        { label: "Display", value: "6.1\" OLED", category: "Display" }
      ],
      aiSummary: "Great performance.",
      badges: ["Best Overall"]
    },
    {
      id: "p2",
      name: "Galaxy S24 Ultra",
      brand: "Samsung",
      retailer: "bestbuy",
      retailerColor: "#003B64",
      url: "https://www.bestbuy.ca/galaxys24ultra",
      specs: [
        { label: "Processor", value: "Snapdragon 8 Gen 3", category: "Performance" },
        { label: "Display", value: "6.8\" AMOLED", category: "Display" }
      ],
      aiSummary: "Great display.",
      badges: ["Best Display"]
    }
  ],
  keyDifferences: [{ label: "Display", values: ["6.1\"", "6.8\""] }],
  aiSummary: "Both are great flagship phones.",
  createdAt: new Date().toISOString()
};

export const useComparisonStore = create<ComparisonStore>((set) => ({
  urls: ["", ""],
  isLoading: false,
  loadingMessage: "Analyzing products...",
  activeComparison: null,
  recentComparisons: [
    {
      id: "1",
      title: "iPhone 15 Pro vs Galaxy S24 Ultra",
      date: "2 hours ago",
      urls: [
        "https://www.bestbuy.ca/iphone15pro",
        "https://www.bestbuy.ca/galaxys24ultra",
      ],
      result: MOCK_RESULT,
    },
  ],
  updateUrl: (index, url) =>
    set((state) => {
      const newUrls = [...state.urls];
      newUrls[index] = url;
      return { urls: newUrls };
    }),
  addUrl: () =>
    set((state) =>
      state.urls.length < 4 ? { urls: [...state.urls, ""] } : state
    ),
  removeUrl: (index) =>
    set((state) => ({
      urls: state.urls.filter((_, i) => i !== index),
    })),
  setUrls: (urls) => set({ urls }),
  setLoading: (isLoading, message) =>
    set({ isLoading, loadingMessage: message ?? "Analyzing products..." }),
  setActiveComparison: (result) => set({ activeComparison: result }),
  addRecentComparison: (comparison) =>
    set((state) => ({
      recentComparisons: [comparison, ...state.recentComparisons].slice(0, 10),
    })),
}));
