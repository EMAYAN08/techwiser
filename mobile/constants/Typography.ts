import { Platform, TextStyle, FontVariant } from 'react-native';

export const Fonts = {
  primary: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const fonts = {
  displayMedium: "ClashDisplay-Medium",
  displaySemibold: "ClashDisplay-Semibold",
  displayBold: "ClashDisplay-Bold",
  uiRegular: "Satoshi-Regular",
  uiMedium: "Satoshi-Medium",
  uiBold: "Satoshi-Bold",
} as const;

export const type = {
  screenTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  productHero: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  productName: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  price: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    lineHeight: 20,
    fontVariant: ["tabular-nums"] as FontVariant[],
  },
  priceHero: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ["tabular-nums"] as FontVariant[],
  },
  subtitle: {
    fontFamily: fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  eyebrow: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
  },
  button: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  specLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  specValue: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  chip: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    lineHeight: 16,
  },
};

export const Typography = {
  ...type,
  display: type.screenTitle,
  headline: type.productName,
  body: type.body,
  caption: type.caption,
};
