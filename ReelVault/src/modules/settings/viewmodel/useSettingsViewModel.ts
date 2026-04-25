import { useMemo, useState } from 'react';
import {
  aboutOptions,
  accountOptions,
  appearanceOptions,
  downloadOptions,
} from '../model/settingsModel';

export const useSettingsViewModel = () => {
  const [autoDownload, setAutoDownload] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [selectedAccent, setSelectedAccent] = useState('#3E8DFF');

  return useMemo(
    () => ({
      accountOptions,
      downloadOptions,
      appearanceOptions,
      aboutOptions,
      autoDownload,
      setAutoDownload,
      isDarkTheme,
      setIsDarkTheme,
      selectedAccent,
      setSelectedAccent,
      accentColors: ['#3E8DFF', '#7C4DFF', '#10B981', '#C56B28'],
    }),
    [autoDownload, isDarkTheme, selectedAccent],
  );
};
