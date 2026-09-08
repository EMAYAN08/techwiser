import type { ImageSourcePropType } from "react-native";

export type WellTint = {
  wash: string;
  wellDark: string;
};

export type WellDef = {
  id: string;
  label: string;
  icon: ImageSourcePropType;
  tint: WellTint;
};

const TINT = {
  blue: { wash: "#DCE8F6", wellDark: "#2A3340" },
  gold: { wash: "#F6E7C4", wellDark: "#3A3424" },
  sand: { wash: "#F3E9D6", wellDark: "#3A3328" },
  mint: { wash: "#DDEEE4", wellDark: "#26382C" },
  slate: { wash: "#E4E8EE", wellDark: "#2C3038" },
  peach: { wash: "#F6E2D6", wellDark: "#3A2E28" },
  lilac: { wash: "#E8E4F2", wellDark: "#2E2C38" },
  ice: { wash: "#E0EEF6", wellDark: "#28343C" },
  rose: { wash: "#F6E0E0", wellDark: "#3A2C2C" },
} as const;

export const ALL_WELL: WellDef = {
  id: "all",
  label: "All",
  icon: require("../assets/icons/all.png"),
  tint: TINT.lilac,
};

export const TYPE_WELLS: WellDef[] = [
  { id: "laptop", label: "Laptops", icon: require("../assets/icons/type-laptop.png"), tint: TINT.ice },
  { id: "pc", label: "PCs", icon: require("../assets/icons/type-pc.png"), tint: TINT.slate },
  { id: "smartphone", label: "Smartphones", icon: require("../assets/icons/type-phone.png"), tint: TINT.mint },
  { id: "tablet", label: "Tablets", icon: require("../assets/icons/type-tablet.png"), tint: TINT.sand },
  { id: "tv", label: "TVs", icon: require("../assets/icons/type-tv.png"), tint: TINT.slate },
  { id: "major", label: "Major", icon: require("../assets/icons/type-major.png"), tint: TINT.ice },
  { id: "minor", label: "Minor", icon: require("../assets/icons/type-minor.png"), tint: TINT.peach },
  { id: "other", label: "Other", icon: require("../assets/icons/type-other.png"), tint: TINT.gold },
];

export const RETAIL_WELLS: Record<string, WellDef> = {
  bestbuy: { id: "bestbuy", label: "Best Buy", icon: require("../assets/logos/bestbuy.png"), tint: TINT.gold },
  amazon: { id: "amazon", label: "Amazon", icon: require("../assets/logos/amazon.png"), tint: TINT.sand },
  canadacomputers: { id: "canadacomputers", label: "Canada Comp.", icon: require("../assets/logos/canadacomputers.jpg"), tint: TINT.ice },
  costco: { id: "costco", label: "Costco", icon: require("../assets/logos/costco.png"), tint: TINT.peach },
  walmart: { id: "walmart", label: "Walmart", icon: require("../assets/logos/walmart.png"), tint: TINT.blue },
  staples: { id: "staples", label: "Staples", icon: require("../assets/logos/staples.png"), tint: TINT.rose },
  other: { id: "other", label: "Other", icon: require("../assets/icons/retail-other.png"), tint: TINT.slate },
};

export const RETAIL_ORDER = [
  "bestbuy",
  "amazon",
  "canadacomputers",
  "costco",
  "walmart",
  "staples",
  "memoryexpress",
  "newegg",
  "thesource",
  "other",
] as const;
