import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X, CloudCheck } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

/**
 * PWA 更新与离线就绪提示组件
 * - 检测到新版本时弹窗询问用户刷新
 * - 首次离线就绪时弹窗告知（自动消失）
 * 在 App 顶层挂载一次即可。
 */
export default function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  // 保存 update 函数以便在点击「立即更新」时调用
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

  // 离线就绪提示 3 秒后自动消失
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
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/15 border border-indigo-500/30">
              {needRefresh ? (
                <RefreshCw className="w-5 h-5 text-indigo-300" />
              ) : (
                <CloudCheck className="w-5 h-5 text-emerald-300" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">
                {needRefresh ? '发现新版本' : '已支持离线访问'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {needRefresh
                  ? '刷新页面以获取最新投档数据与功能'
                  : '应用已缓存，无网络也可查询历年数据'}
              </p>
            </div>

            {needRefresh && (
              <>
                <button
                  onClick={handleUpdate}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  立即更新
                </button>
                <button
                  onClick={close}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer shrink-0"
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
