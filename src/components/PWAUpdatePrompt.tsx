import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X, CloudCheck } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

export default function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateFn, setUpdateFn] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });
    setUpdateFn(() => () => update(true));
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    const timer = setTimeout(() => setOfflineReady(false), 3000);
    return () => clearTimeout(timer);
  }, [offlineReady]);

  const handleUpdate = useCallback(() => {
    updateFn?.();
  }, [updateFn]);

  const close = () => setNeedRefresh(false);

  return (
    <AnimatePresence>
      {(needRefresh || offlineReady) && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md"
        >
          <div className="bg-[#1d1d1f] rounded-[18px] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0 bg-white/10">
              {needRefresh ? (
                <RefreshCw className="w-5 h-5 text-white" />
              ) : (
                <CloudCheck className="w-5 h-5 text-[#1d7a3d]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-white leading-tight">
                {needRefresh ? '发现新版本' : '已支持离线访问'}
              </p>
              <p className="text-[13px] text-[#86868b] mt-0.5 truncate">
                {needRefresh
                  ? '刷新页面以获取最新投档数据与功能'
                  : '应用已缓存，无网络也可查询历年数据'}
              </p>
            </div>

            {needRefresh && (
              <>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 rounded-full text-[13px] font-semibold bg-[#0066cc] text-white hover:bg-[#0055aa] transition-colors cursor-pointer shrink-0 apple-press"
                >
                  立即更新
                </button>
                <button
                  onClick={close}
                  className="p-1.5 text-[#86868b] hover:text-white rounded-[8px] cursor-pointer shrink-0 transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
