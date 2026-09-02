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
  description?: string;
  whatsInTheBox?: string[];
  userInsights?: string;
  specs: Spec[];
  rawSpecs?: Array<{ label: string; value: string }>;
  aiSummary?: string;
  badges?: string[];
}

export interface ComparisonResult {
  groupedSpecs?: any;
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
  // Dev helpers — only for the in-app mock-data dev tools.
  seedMockComparison: (variant: "two" | "three") => void;
  clearActiveComparison: () => void;
}

// ---------------------------------------------------------------------------
// Mock data — iPhone 15 Pro vs Galaxy S24 Ultra
// ---------------------------------------------------------------------------

const MOCK_IPHONE: Product = {
  id: "p1",
  name: "Apple iPhone 15 Pro 256GB Titanium Blue",
  brand: "Apple",
  retailer: "bestbuy",
  retailerColor: "#003B64",
  price: "$1,449 CAD",
  url: "https://www.bestbuy.ca/en-ca/product/iphone-15-pro/16802913",
  imageUrl: null,
  aiSummary:
    "Best-in-class performance and a deeply integrated ecosystem. Great for users already invested in Apple services and those who prioritize video recording and long-term software support.",
  badges: ["Best Video", "Best Ecosystem", "Best Performance"],
    rawSpecs: [{ label: "Processor", value: "A17 Pro" }, { label: "RAM", value: "8 GB" }],
  specs: [
    // Performance
    { label: "Processor", value: "Apple A17 Pro", category: "Performance", numericValue: 1, isWinner: true },
    { label: "RAM", value: "8 GB", category: "Performance", unit: "GB", numericValue: 8, isDraw: true },
    { label: "Storage", value: "256 GB", category: "Performance", unit: "GB", numericValue: 256, isWinner: true },
    // Display
    { label: "Display size", value: "6.1\"", category: "Display", numericValue: 6.1 },
    { label: "Panel type", value: "LTPO Super Retina XDR OLED", category: "Display" },
    { label: "Refresh rate", value: "120 Hz", category: "Display", unit: "Hz", numericValue: 120, isDraw: true },
    { label: "Peak brightness", value: "2,000 nits", category: "Display", unit: "nits", numericValue: 2000, isDraw: true },
    { label: "Resolution", value: "2556 × 1179", category: "Display" },
    // Battery
    { label: "Battery capacity", value: "3,274 mAh", category: "Battery", unit: "mAh", numericValue: 3274 },
    { label: "Wired charging", value: "20 W", category: "Battery", unit: "W", numericValue: 20 },
    { label: "Wireless charging", value: "15 W MagSafe", category: "Battery" },
    // Camera
    { label: "Main sensor", value: "48 MP, f/1.78", category: "Camera", numericValue: 48, isDraw: true },
    { label: "Ultrawide", value: "12 MP, f/2.2", category: "Camera", numericValue: 12, isDraw: true },
    { label: "Telephoto", value: "12 MP, 3× optical", category: "Camera" },
    { label: "Front camera", value: "12 MP TrueDepth", category: "Camera", numericValue: 12, isDraw: true },
    { label: "Video recording", value: "4K Dolby Vision HDR", category: "Camera" },
    // Design
    { label: "Weight", value: "187 g", category: "Design", unit: "g", numericValue: 187, isWinner: true },
    { label: "Frame", value: "Titanium", category: "Design" },
    { label: "IP rating", value: "IP68", category: "Design" },
    // Connectivity
    { label: "USB-C", value: "USB 3 (10 Gbps)", category: "Connectivity" },
    { label: "Wi-Fi", value: "Wi-Fi 6E", category: "Connectivity" },
    { label: "Bluetooth", value: "5.3", category: "Connectivity" },
  ],
};

const MOCK_SAMSUNG: Product = {
  id: "p2",
  name: "Samsung Galaxy S24 Ultra 512GB Titanium Black",
  brand: "Samsung",
  retailer: "bestbuy",
  retailerColor: "#003B64",
  price: "$1,679 CAD",
  url: "https://www.bestbuy.ca/en-ca/product/galaxy-s24-ultra/16803012",
  imageUrl: null,
  aiSummary:
    "The Android flagship to beat. Outstanding telephoto camera, S Pen productivity, and the brightest display in its class. Best for power users and content creators who want a single device for work and play.",
  badges: ["Best Camera", "Best Display", "Best for Productivity"],
  specs: [
    // Performance
    { label: "Processor", value: "Snapdragon 8 Gen 3 for Galaxy", category: "Performance", numericValue: 1, isDraw: true },
    { label: "RAM", value: "12 GB", category: "Performance", unit: "GB", numericValue: 12, isDraw: true },
    { label: "Storage", value: "512 GB", category: "Performance", unit: "GB", numericValue: 512, isWinner: true },
    // Display
    { label: "Display size", value: "6.8\"", category: "Display", numericValue: 6.8, isWinner: true },
    { label: "Panel type", value: "LTPO Dynamic AMOLED 2X", category: "Display" },
    { label: "Refresh rate", value: "120 Hz", category: "Display", unit: "Hz", numericValue: 120, isDraw: true },
    { label: "Peak brightness", value: "2,600 nits", category: "Display", unit: "nits", numericValue: 2600, isWinner: true },
    { label: "Resolution", value: "3120 × 1440", category: "Display" },
    // Battery
    { label: "Battery capacity", value: "5,000 mAh", category: "Battery", unit: "mAh", numericValue: 5000, isWinner: true },
    { label: "Wired charging", value: "45 W", category: "Battery", unit: "W", numericValue: 45, isWinner: true },
    { label: "Wireless charging", value: "15 W Qi", category: "Battery" },
    // Camera
    { label: "Main sensor", value: "200 MP, f/1.7", category: "Camera", numericValue: 200, isWinner: true },
    { label: "Ultrawide", value: "12 MP, f/2.2", category: "Camera", numericValue: 12, isDraw: true },
    { label: "Telephoto", value: "50 MP, 5× periscope", category: "Camera", numericValue: 50, isWinner: true },
    { label: "Front camera", value: "12 MP", category: "Camera", numericValue: 12, isDraw: true },
    { label: "Video recording", value: "8K @ 30 fps, 4K @ 120 fps", category: "Camera" },
    // Design
    { label: "Weight", value: "232 g", category: "Design", unit: "g", numericValue: 232 },
    { label: "Frame", value: "Titanium", category: "Design" },
    { label: "IP rating", value: "IP68", category: "Design" },
    // Connectivity
    { label: "USB-C", value: "USB 3.2 (10 Gbps)", category: "Connectivity" },
    { label: "Wi-Fi", value: "Wi-Fi 7", category: "Connectivity", isWinner: true },
    { label: "Bluetooth", value: "5.3", category: "Connectivity" },
  ],
};

const MOCK_RESULT: ComparisonResult = {
  id: "mock-iphone-samsung",
  products: [MOCK_IPHONE, MOCK_SAMSUNG],
  keyDifferences: [
    { label: "Display size", values: ["6.1\"", "6.8\""] },
    { label: "Peak brightness", values: ["2,000 nits", "2,600 nits"] },
    { label: "Battery capacity", values: ["3,274 mAh", "5,000 mAh"] },
    { label: "Telephoto", values: ["12 MP, 3×", "50 MP, 5×"] },
    { label: "RAM", values: ["8 GB", "12 GB"] },
  ],
  aiSummary:
    "The iPhone 15 Pro and Galaxy S24 Ultra sit at the top of the flagship class, but they make different bets. The S24 Ultra wins on hardware: a larger, brighter display, a 5,000 mAh battery, a 5× periscope telephoto, and 12 GB of RAM. The iPhone 15 Pro counters with the A17 Pro's raw performance, lighter titanium build, deeper ecosystem integration, and a class-leading video pipeline. Pick the S24 Ultra if camera zoom, display size, and battery life are non-negotiable. Pick the iPhone if you shoot a lot of video, want the smoothest long-term software support, or live inside Apple's ecosystem.",
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Mock data — Pixel 8 Pro joins the party (3 products)
// ---------------------------------------------------------------------------

const MOCK_PIXEL: Product = {
  id: "p3",
  name: "Google Pixel 8 Pro 256GB Obsidian",
  brand: "Google",
  retailer: "bestbuy",
  retailerColor: "#003B64",
  price: "$1,349 CAD",
  url: "https://www.bestbuy.ca/en-ca/product/pixel-8-pro/16789012",
  imageUrl: null,
  aiSummary:
    "The cleanest Android experience with the longest software support window in the Pixel lineup, plus genuinely useful AI features that aren't gimmicks. Falls behind on raw performance and telephoto reach, but the most well-rounded of the three for everyday use.",
  badges: ["Best Software", "Best Value"],
    rawSpecs: [{ label: "Processor", value: "Tensor G3" }, { label: "RAM", value: "12 GB" }],
  specs: [
    // Performance
    { label: "Processor", value: "Google Tensor G3", category: "Performance", numericValue: 1 },
    { label: "RAM", value: "12 GB", category: "Performance", unit: "GB", numericValue: 12, isDraw: true },
    { label: "Storage", value: "256 GB", category: "Performance", unit: "GB", numericValue: 256, isWinner: true },
    // Display
    { label: "Display size", value: "6.7\"", category: "Display", numericValue: 6.7 },
    { label: "Panel type", value: "LTPO Super Actua OLED", category: "Display" },
    { label: "Refresh rate", value: "120 Hz", category: "Display", unit: "Hz", numericValue: 120, isDraw: true },
    { label: "Peak brightness", value: "2,400 nits", category: "Display", unit: "nits", numericValue: 2400 },
    { label: "Resolution", value: "2992 × 1344", category: "Display" },
    // Battery
    { label: "Battery capacity", value: "5,050 mAh", category: "Battery", unit: "mAh", numericValue: 5050, isWinner: true },
    { label: "Wired charging", value: "30 W", category: "Battery", unit: "W", numericValue: 30 },
    { label: "Wireless charging", value: "23 W Pixel Stand", category: "Battery" },
    // Camera
    { label: "Main sensor", value: "50 MP, f/1.68", category: "Camera", numericValue: 50 },
    { label: "Ultrawide", value: "48 MP, f/1.95", category: "Camera", numericValue: 48, isWinner: true },
    { label: "Telephoto", value: "48 MP, 5× optical", category: "Camera", numericValue: 48 },
    { label: "Front camera", value: "10.5 MP", category: "Camera", numericValue: 10.5 },
    { label: "Video recording", value: "4K @ 60 fps HDR", category: "Camera" },
    // Design
    { label: "Weight", value: "213 g", category: "Design", unit: "g", numericValue: 213 },
    { label: "Frame", value: "Polished aluminum", category: "Design" },
    { label: "IP rating", value: "IP68", category: "Design" },
    // Connectivity
    { label: "USB-C", value: "USB 3.2 (10 Gbps)", category: "Connectivity" },
    { label: "Wi-Fi", value: "Wi-Fi 7", category: "Connectivity", isWinner: true },
    { label: "Bluetooth", value: "5.3", category: "Connectivity" },
  ],
};

const MOCK_RESULT_3_PRODUCT: ComparisonResult = {
  id: "mock-flagship-trio",
  products: [MOCK_IPHONE, MOCK_SAMSUNG, MOCK_PIXEL],
  keyDifferences: [
    { label: "Display size", values: ["6.1\"", "6.8\"", "6.7\""] },
    { label: "Battery capacity", values: ["3,274 mAh", "5,000 mAh", "5,050 mAh"] },
    { label: "Telephoto", values: ["12 MP, 3×", "50 MP, 5×", "48 MP, 5×"] },
    { label: "RAM", values: ["8 GB", "12 GB", "12 GB"] },
  ],
  aiSummary:
    "Three top-tier flagships, three different priorities. The Galaxy S24 Ultra leads on raw hardware: biggest display, longest telephoto, most RAM. The Pixel 8 Pro punches above its weight with clean software, 7 years of updates, and the best ultrawide camera in the group. The iPhone 15 Pro trails on paper but still wins on video, ecosystem, and long-term resale.",
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useComparisonStore = create<ComparisonStore>((set) => ({
  urls: [
    "https://www.bestbuy.ca/en-ca/product/iphone-15-pro/16802913",
    "https://www.bestbuy.ca/en-ca/product/galaxy-s24-ultra/16803012",
    "",
  ],
  isLoading: false,
  loadingMessage: "Analyzing products...",
  activeComparison: MOCK_RESULT,
  recentComparisons: [
    {
      id: "1",
      title: "iPhone 15 Pro vs Galaxy S24 Ultra",
      date: "2 hours ago",
      urls: [
        "https://www.bestbuy.ca/en-ca/product/iphone-15-pro/16802913",
        "https://www.bestbuy.ca/en-ca/product/galaxy-s24-ultra/16803012",
      ],
      result: MOCK_RESULT,
    },
    {
      id: "2",
      title: "iPhone 15 Pro vs Galaxy S24 Ultra vs Pixel 8 Pro",
      date: "Yesterday",
      urls: [
        "https://www.bestbuy.ca/en-ca/product/iphone-15-pro/16802913",
        "https://www.bestbuy.ca/en-ca/product/galaxy-s24-ultra/16803012",
        "https://www.bestbuy.ca/en-ca/product/pixel-8-pro/16789012",
      ],
      result: MOCK_RESULT_3_PRODUCT,
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
  // Dev helpers
  seedMockComparison: (variant) =>
    set({
      activeComparison:
        variant === "three" ? MOCK_RESULT_3_PRODUCT : MOCK_RESULT,
    }),
  clearActiveComparison: () => set({ activeComparison: null }),
}));

