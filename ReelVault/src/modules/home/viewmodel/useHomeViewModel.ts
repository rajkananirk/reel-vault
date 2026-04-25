import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadSavedDownloads } from '../../../common/storage/downloadHistory';
import { platforms, RecentItem, recents } from '../model/homeModel';

export const useHomeViewModel = () => {
  const [url, setUrl] = useState('');
  const [recentHistory, setRecentHistory] = useState<RecentItem[]>([]);

  const reloadHistory = useCallback(async () => {
    const saved = await loadSavedDownloads();
    if (!saved.length) {
      setRecentHistory(recents);
      return;
    }
    const mapped: RecentItem[] = saved.map(item => ({
      id: item.id,
      title: item.title,
      source: item.platformName,
      size: item.quality,
      thumbnail: item.thumbnailUrl,
      videoUrl: item.videoUrl,
      sourceUrl: item.sourceUrl,
    }));
    setRecentHistory(mapped);
  }, []);

  useEffect(() => {
    reloadHistory().catch(() => setRecentHistory(recents));
  }, [reloadHistory]);

  return useMemo(
    () => ({
      appName: 'ReelVault',
      appTagline: 'FAST. SIMPLE. EVERYWHERE.',
      url,
      setUrl,
      platforms,
      recents: recentHistory,
      reloadHistory,
    }),
    [url, recentHistory, reloadHistory],
  );
};
