import { useMemo } from 'react';
import { splashModel } from '../model/splashModel';

export const useSplashViewModel = () =>
  useMemo(
    () => ({
      title: splashModel.title,
      trustBadge: splashModel.trustBadge,
      headline: splashModel.headline,
      subtitle: splashModel.subtitle,
      ctaLabel: splashModel.ctaLabel,
      footerNote: splashModel.footerNote,
      ratingLabel: splashModel.ratingLabel,
      ratingSub: splashModel.ratingSub,
      trustPoints: splashModel.trustPoints,
      platforms: splashModel.platforms,
    }),
    [],
  );
