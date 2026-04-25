import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadSavedDownloads } from '../../../common/storage/downloadHistory';
import { CompletedDownload } from '../model/downloadsModel';

export const useDownloadsViewModel = () => {
  const [savedCompleted, setSavedCompleted] = useState<CompletedDownload[]>([]);

  const reloadHistory = useCallback(async () => {
    const saved = await loadSavedDownloads();
    if (!saved.length) {
      setSavedCompleted([]);
      return;
    }
    setSavedCompleted(
      saved.map(item => ({
        id: item.id,
        title: item.title,
        source: item.platformName,
        size: item.quality,
        thumbnail: item.thumbnailUrl || item.videoUrl,
        videoUrl: item.videoUrl,
        sourceUrl: item.sourceUrl,
      })),
    );
  }, []);

  useEffect(() => {
    reloadHistory().catch(() => setSavedCompleted([]));
  }, [reloadHistory]);

  return useMemo(
    () => ({
      completedDownloads: savedCompleted,
      reloadHistory,
    }),
    [savedCompleted, reloadHistory],
  );
};
