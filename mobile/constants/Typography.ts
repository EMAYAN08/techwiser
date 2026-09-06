import { TextStyle, FontVariant, Platform } from "react-native";

const fontFix: TextStyle =
  Platform.OS === "android"
    ? { includeFontPadding: false, textAlignVertical: "center" }
    : {};

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
    fontSize: 30,
    lineHeight: 42,
    letterSpacing: -0.8,
    ...fontFix,
  } as TextStyle,
  productHero: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    ...fontFix,
  } as TextStyle,
  sectionTitle: {
    fontFamily: fonts.displaySemibold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    ...fontFix,
  } as TextStyle,
  navTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    ...fontFix,
  } as TextStyle,
  productName: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    ...fontFix,
  } as TextStyle,
  price: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    lineHeight: 20,
    fontVariant: ["tabular-nums"] as FontVariant[],
    ...fontFix,
  } as TextStyle,
  priceHero: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ["tabular-nums"] as FontVariant[],
    ...fontFix,
  } as TextStyle,
  subtitle: {
    fontFamily: fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    ...fontFix,
  } as TextStyle,
  body: {
    fontFamily: fonts.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    ...fontFix,
  } as TextStyle,
  eyebrow: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    ...fontFix,
  } as TextStyle,
  button: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    lineHeight: 20,
    ...fontFix,
  } as TextStyle,
  caption: {
    fontFamily: fonts.uiRegular,
    fontSize: 13,
    lineHeight: 18,
    ...fontFix,
  } as TextStyle,
  specLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    ...fontFix,
  } as TextStyle,
  specValue: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    lineHeight: 20,
    ...fontFix,
  } as TextStyle,
  chip: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    lineHeight: 16,
    ...fontFix,
  } as TextStyle,
};

/** Back-compat aliases used across screens. */
export const Typography = {
  ...type,
  display: type.screenTitle,
  headline: type.productName,
  body: type.body,
  caption: type.caption,
};

export const Fonts = {
  primary: fonts.uiRegular,
  mono: fonts.uiRegular,
};
