import React, { useState, useCallback } from 'react';
import { Star, X, Download, ChevronLeft, Trash2 } from 'lucide-react';
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
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-[#1d1d1f] hover:bg-[#333333] text-[#0066cc] cursor-pointer flex items-center justify-center transition-all apple-press"
            title="收藏列表"
          >
            <Star className="w-4.5 h-4.5" fill="currentColor" />
            {favorites.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#0066cc] text-white text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-semibold border-2 border-[#f5f5f7]">
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
              className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-80 max-h-[70vh] bg-white border border-[#d2d2d7] rounded-[18px] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8ed] shrink-0">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#0066cc]" fill="currentColor" />
                  <span className="text-[15px] font-semibold text-[#1d1d1f]">
                    我的收藏
                  </span>
                  {favorites.length > 0 && (
                    <span className="text-[11px] bg-[#0066cc]/8 text-[#0066cc] px-2 py-0.5 rounded-full font-semibold">
                      {favorites.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={togglePanel}
                  className="text-[#86868b] hover:text-[#1d1d1f] cursor-pointer transition-colors"
                  title="收起面板"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                {favorites.length === 0 ? (
                  <div className="p-6 text-center text-[#86868b] text-[13px]">
                    点击列表中第一列的 <Star className="w-3 h-3 inline text-[#86868b] align-[-2px]" /> 按钮收藏专业组
                  </div>
                ) : (
                  <ul className="divide-y divide-[#e8e8ed]">
                    {favorites.map((g) => (
                      <li
                        key={getFavKey(g)}
                        className="px-4 py-3 hover:bg-[#f5f5f7] transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-[#1d1d1f] truncate" title={g.school}>
                              {g.school}
                            </div>
                            <div className="text-[12px] text-[#1d1d1f] truncate mt-0.5" title={g.majorName}>
                              {g.majorName}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-[#86868b]">{g.groupCode}</span>
                              <span className="text-[11px] font-semibold text-[#0066cc]">{g.minScore}分</span>
                              <span className="text-[11px] font-semibold text-[#0066cc]">{g.minRank.toLocaleString()}名</span>
                              {g.tier && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tierMeta[g.tier].badgeClass}`}>
                                  {g.tier}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => onRemove(g)}
                            className="text-[#d2d2d7] hover:text-[#a02828] cursor-pointer transition-colors shrink-0 mt-0.5"
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
                <div className="flex items-center gap-2 px-4 py-3 border-t border-[#e8e8ed] shrink-0">
                  <button
                    onClick={onClear}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#86868b] hover:text-[#a02828] hover:bg-[#a02828]/5 cursor-pointer transition-colors"
                    title="清空收藏"
                  >
                    <Trash2 className="w-3 h-3" />
                    清空
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => exportCSV(favorites)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-[#0066cc] text-white hover:bg-[#0055aa] cursor-pointer transition-colors apple-press"
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
