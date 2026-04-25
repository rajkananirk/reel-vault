import { useMemo } from 'react';
import { splashModel } from '../model/splashModel';

export const useSplashViewModel = () =>
  useMemo(
    () => ({
      title: splashModel.title,
      subtitle: splashModel.subtitle,
      progress: splashModel.progress,
    }),
    [],
  );
