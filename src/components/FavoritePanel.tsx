import React, { useState, useCallback } from 'react';
import { Star, X, Download, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { MajorGroupData } from '../types';
import { tierMeta } from '../tierUtils';

interface FavoritePanelProps {
  favorites: MajorGroupData[];
  onRemove: (item: MajorGroupData) => void;
  onClear: () => void;
}

const getFavKey = (g: MajorGroupData) => `${g.schoolGroupCode}__${g.majorCode}`;

const STORAGE_KEY = 'group-favorites-cache';

export function loadFavorites(): MajorGroupData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MajorGroupData[];
  } catch {
    return [];
  }
}

export function saveFavorites(favs: MajorGroupData[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch { /* quota exceeded, ignore */ }
}

export function isFavorited(favs: MajorGroupData[], item: MajorGroupData): boolean {
  return favs.some((f) => getFavKey(f) === getFavKey(item));
}

export function toggleFavorite(favs: MajorGroupData[], item: MajorGroupData): MajorGroupData[] {
  const key = getFavKey(item);
  const idx = favs.findIndex((f) => getFavKey(f) === key);
  if (idx >= 0) {
    return favs.filter((_, i) => i !== idx);
  }
  return [...favs, item];
}

function exportCSV(favorites: MajorGroupData[]) {
  if (favorites.length === 0) return;
  const headers = [
    '院校名称', '专业全称', '专业代码', '专业组代码',
    '院校专业组代码', '科类', '批次', '层次',
    '所在省', '城市', '专业录取人数', '专业录取最低分',
    '专业最低位次', '志愿梯队'
  ];
  const rows = favorites.map((g) => [
    g.school,
    g.majorName,
    g.majorCode,
    g.groupCode,
    g.schoolGroupCode,
    g.subject,
    g.batch,
    g.level,
    g.province,
    g.city,
    g.admissionCount,
    g.minScore,
    g.minRank,
    g.tier ?? ''
  ]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `收藏专业组_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FavoritePanel({ favorites, onRemove, onClear }: FavoritePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const togglePanel = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <>
      <AnimatePresence>
        {!expanded && (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            onClick={togglePanel}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 hover:border-white/30 hover:bg-white/15 text-amber-400 shadow-xl cursor-pointer flex items-center justify-center transition-all"
            title="收藏列表"
          >
            <Star className="w-4.5 h-4.5" fill="currentColor" />
            {favorites.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[0.5625rem] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold border-2 border-[#020617]">
                {favorites.length > 99 ? '99+' : favorites.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 md:hidden"
              onClick={togglePanel}
            />

            <motion.div
              key="panel"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="fixed left-2 top-1/2 -translate-y-1/2 z-50 w-80 max-h-[70vh] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
                  <span className="text-sm font-bold text-white">
                    我的收藏
                  </span>
                  {favorites.length > 0 && (
                    <span className="text-[0.625rem] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">
                      {favorites.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={togglePanel}
                  className="text-slate-400 hover:text-white cursor-pointer transition-colors"
                  title="收起面板"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                {favorites.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    点击列表中第一列的 <Star className="w-3 h-3 inline text-slate-500 align-[-2px]" /> 按钮收藏专业组
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {favorites.map((g) => (
                      <li
                        key={getFavKey(g)}
                        className="px-3 py-2.5 hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[0.6875rem] font-bold text-white truncate" title={g.school}>
                              {g.school}
                            </div>
                            <div className="text-[0.625rem] text-slate-400 truncate mt-0.5" title={g.majorName}>
                              {g.majorName}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[0.5625rem] text-slate-500 font-mono">{g.groupCode}</span>
                              <span className="text-[0.5625rem] font-bold text-blue-400">{g.minScore}分</span>
                              <span className="text-[0.5625rem] text-slate-400">{g.minRank.toLocaleString()}名</span>
                              {g.tier && (
                                <span className={`text-[0.5rem] px-1 py-0.5 rounded font-bold ${tierMeta[g.tier].badgeClass}`}>
                                  {g.tier}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => onRemove(g)}
                            className="text-slate-600 hover:text-rose-400 cursor-pointer transition-colors shrink-0 mt-0.5"
                            title="取消收藏"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {favorites.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/10 shrink-0">
                  <button
                    onClick={onClear}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.625rem] font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                    title="清空收藏"
                  >
                    <Trash2 className="w-3 h-3" />
                    清空
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => exportCSV(favorites)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.625rem] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 cursor-pointer transition-colors"
                    title="导出CSV"
                  >
                    <Download className="w-3 h-3" />
                    导出CSV
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
