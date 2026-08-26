import { Platform, TextStyle } from 'react-native';

export const Fonts = {
  primary: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

type TypographyScale = 'display' | 'headline' | 'body' | 'caption';

export const Typography: Record<TypographyScale, TextStyle> = {
  display: {
    fontFamily: Fonts.primary,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: Fonts.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontFamily: Fonts.primary,
    fontSize: 15,
    fontWeight: 'normal',
    lineHeight: 21,
  },
  caption: {
    fontFamily: Fonts.primary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
};
