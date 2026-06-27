import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowUpDown,
  X,
  Activity,
  Compass,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import type { MajorGroupData, AdmissionTier } from '../types';
import { tierMeta, tierOrder } from '../tierUtils';
import { getCachedGroupData, setCachedGroupData } from '../groupDb';
import GroupFilterWorker from '../groupFilter.worker?worker';

type GroupSubject = '历史' | '物理';
type GroupLevel = '本科' | '专科';
type SortBy = 'rankAsc' | 'rankDesc' | 'scoreDesc' | 'scoreAsc' | 'name';

/**
 * 2025 院校专业录取数据 Tab
 * - 大数据集按科类分别加载，优先 IndexedDB 缓存，未命中再 fetch JSON
 * - 筛选/排序交由 Web Worker 离线计算，避免阻塞主线程
 * - 虚拟列表渲染；点击被截断单元格弹出气泡展示完整文本
 */
export default function GroupTab() {
  // 专业组 Tab 独立筛选状态
  const [groupLevel, setGroupLevel] = useState<GroupLevel>('本科');
  const [groupSubject, setGroupSubject] = useState<GroupSubject>('物理');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSortBy, setGroupSortBy] = useState<SortBy>('rankAsc');
  // 专业组 Tab 独立的排位/分数筛选
  const [groupInputMode, setGroupInputMode] = useState<'rank' | 'score'>(
    'rank'
  );
  const [groupRankInput, setGroupRankInput] = useState<string>('');
  const [groupScoreInput, setGroupScoreInput] = useState<string>('');
  // 专业组 Tab 独立的冲/稳/保 梯队筛选
  const [groupTier, setGroupTier] = useState<'all' | AdmissionTier>('all');
  // 省/市筛选（默认广东省、广州市）
  const [groupProvince, setGroupProvince] = useState<string>('广东');
  const [groupCity, setGroupCity] = useState<string>('广州');
  // 搜索防抖：groupSearch 为即时值（受控输入），debouncedGroupSearch 为实际参与筛选的值
  const [debouncedGroupSearch, setDebouncedGroupSearch] = useState<string>('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedGroupSearch(groupSearch), 300);
    return () => clearTimeout(t);
  }, [groupSearch]);

  // 专业组大数据集：按科类分别加载，优先读取 IndexedDB 缓存，未命中再加载 JSON 并回写缓存
  const [groupData, setGroupData] = useState<MajorGroupData[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setGroupData(null);
    (async () => {
      // 1. 优先尝试 IndexedDB 缓存
      const cached = await getCachedGroupData(groupSubject);
      if (cancelled) return;
      if (cached && cached.length > 0) {
        setGroupData(cached);
        return;
      }
      // 2. 未命中则通过 fetch 加载 public 目录下的静态 JSON
      const file =
        groupSubject === '历史'
          ? '/groupData-history.json'
          : '/groupData-physics.json';
      const res = await fetch(file);
      if (cancelled) return;
      const arr = (await res.json()) as MajorGroupData[];
      setGroupData(arr);
      // 3. 回写 IndexedDB 缓存（不阻塞）
      setCachedGroupData(groupSubject, arr);
    })();
    return () => {
      cancelled = true;
    };
  }, [groupSubject]);

  // 可选省/市列表（由已加载数据动态生成，须在 groupData 声明之后）
  const provinceOptions = React.useMemo(() => {
    if (!groupData) return ['广东'];
    return Array.from(
      new Set(groupData.map((g) => g.province).filter(Boolean))
    ).sort();
  }, [groupData]);
  const cityOptions = React.useMemo(() => {
    if (!groupData) return ['广州'];
    const cities = Array.from(
      new Set(
        groupData
          .filter((g) => g.province === groupProvince)
          .map((g) => g.city)
          .filter(Boolean)
      )
    ).sort();
    return cities;
  }, [groupData, groupProvince]);

  // 专业组数据：筛选 + 排序交由 Web Worker 离线计算，避免阻塞主线程渲染与交互
  const GROUP_DEFAULT_LIMIT = 20;
  const [filteredGroupData, setFilteredGroupData] = useState<MajorGroupData[]>(
    []
  );
  // 点击被截断的院校/专业单元格时弹出气泡，展示完整文本
  const [cellPopover, setCellPopover] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  // 单例 Worker（组件生命周期内复用）
  const workerRef = useRef<Worker | null>(null);
  if (!workerRef.current && typeof Worker !== 'undefined') {
    workerRef.current = new GroupFilterWorker();
  }
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !groupData) {
      setFilteredGroupData([]);
      return;
    }
    const handler = (e: MessageEvent<MajorGroupData[]>) =>
      setFilteredGroupData(e.data);
    worker.addEventListener('message', handler);
    worker.postMessage({
      data: groupData,
      level: groupLevel,
      search: debouncedGroupSearch,
      sortBy: groupSortBy,
      scoreInput: groupScoreInput,
      rankInput: groupRankInput,
      defaultLimit: GROUP_DEFAULT_LIMIT,
      tierFilter: groupTier,
      province: groupProvince,
      city: groupCity
    });
    return () => worker.removeEventListener('message', handler);
  }, [
    groupData,
    groupLevel,
    debouncedGroupSearch,
    groupSortBy,
    groupScoreInput,
    groupRankInput,
    groupTier,
    groupProvince,
    groupCity
  ]);
  // 组件卸载时终止 Worker
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // 点击气泡外部或列表滚动时关闭气泡
  useEffect(() => {
    if (!cellPopover) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-cell-popover]')) setCellPopover(null);
    };
    const close = () => setCellPopover(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', close, true); // capture：捕获虚拟列表内部滚动
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', close, true);
    };
  }, [cellPopover]);

  return (
    <>
      <div
        className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl"
        id="tab_group"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              2025 院校专业录取数据查询
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              提取每个专业对应的专业录取人数、录取最低分与最低位次。每个专业单独展示。
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* 本科 / 专科 */}
            <div className="grid grid-cols-2 p-1 bg-black/20 rounded-xl border border-white/5">
              {(['本科', '专科'] as const).map((lv) => (
                <button
                  key={lv}
                  onClick={() => setGroupLevel(lv)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    groupLevel === lv
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
            {/* 科类 历史 / 物理 */}
            <div className="grid grid-cols-2 p-1 bg-black/20 rounded-xl border border-white/5">
              {(['物理', '历史'] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setGroupSubject(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    groupSubject === sub
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            {/* 所在省 / 城市 筛选 */}
            <select
              value={groupProvince}
              onChange={(e) => {
                setGroupProvince(e.target.value);
                // 切换省份时城市重置为空（不限），由用户重新选择
                setGroupCity('');
              }}
              className="bg-white/5 border border-white/20 rounded-xl py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-200 cursor-pointer hover:border-white/30 transition-all [&_option]:bg-slate-950 [&_option]:text-slate-100"
              title="所在省"
            >
              <option value="">全部省份</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={groupCity}
              onChange={(e) => setGroupCity(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-xl py-1.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-200 cursor-pointer hover:border-white/30 transition-all [&_option]:bg-slate-950 [&_option]:text-slate-100"
              title="城市"
            >
              <option value="">全部城市</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 搜索 */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="搜索院校 / 专业 / 专业组代码..."
              className="w-full bg-white/5 border border-white/20 focus:border-blue-500/80 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-100 placeholder:text-slate-500 transition-all"
            />
            {groupSearch && (
              <button
                onClick={() => setGroupSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={groupSortBy}
              onChange={(e) => setGroupSortBy(e.target.value as SortBy)}
              className="bg-white/5 border border-white/20 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-200 cursor-pointer hover:border-white/30 transition-all [&_option]:bg-slate-950 [&_option]:text-slate-100"
            >
              <option value="rankAsc">按最低排位 (升序 - 最好在前)</option>
              <option value="rankDesc">按最低排位 (降序 - 最易在前)</option>
              <option value="scoreDesc">按最低分 (降序 - 最高在前)</option>
              <option value="scoreAsc">按最低分 (升序 - 最低在前)</option>
              <option value="name">按院校名称排序</option>
            </select>
          </div>
        </div>

        {/* 排位 / 分数筛选（专业组 Tab 独立） */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-md">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">
              按全省排位 / 投档分筛选
            </span>
          </div>

          <div className="flex rounded-xl bg-black/20 border border-white/5 p-1 shrink-0">
            <button
              onClick={() => setGroupInputMode('rank')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${groupInputMode === 'rank' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              全省排位
            </button>
            <button
              onClick={() => setGroupInputMode('score')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${groupInputMode === 'score' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              投档分数
            </button>
          </div>

          <div className="flex-1 flex items-center gap-3">
            {groupInputMode === 'rank' ? (
              <div className="relative w-full md:w-64">
                <input
                  type="number"
                  value={groupRankInput}
                  onChange={(e) => setGroupRankInput(e.target.value)}
                  placeholder="请输入全省位次..."
                  className="w-full bg-white/5 border border-white/20 focus:border-blue-500/80 rounded-xl py-2 px-3 text-base font-bold text-blue-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  min="1"
                  pattern="[0-9]*"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  名
                </span>
              </div>
            ) : (
              <div className="relative w-full md:w-64">
                <input
                  type="number"
                  value={groupScoreInput}
                  onChange={(e) => setGroupScoreInput(e.target.value)}
                  placeholder="请输入高考分数..."
                  className="w-full bg-white/5 border border-white/20 focus:border-blue-500/80 rounded-xl py-2 px-3 text-base font-bold text-blue-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  min="100"
                  max="750"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  分
                </span>
              </div>
            )}
          </div>

          <span className="text-[0.6875rem] text-slate-400 md:text-right">
            输入后自动划分冲/稳/保梯队：录取最低分 ≤ 我的分数，或 最低位次 ≥
            我的排位 × 0.85
          </span>
        </div>

        {/* 冲/稳/保 梯队筛选（输入排位或分数后生效） */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-md">
          <div className="flex items-center gap-2 shrink-0">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300">
              志愿梯队筛选
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 shrink-0">
            <button
              onClick={() => setGroupTier('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${groupTier === 'all' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              全部
            </button>
            {tierOrder.map((t) => (
              <button
                key={t}
                onClick={() => setGroupTier(groupTier === t ? 'all' : t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${groupTier === t ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${tierMeta[t].dotClass}`}
                />
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.825rem] text-slate-400">
            {tierOrder.map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${tierMeta[t].dotClass}`}
                />
                <strong className={tierMeta[t].countClass}>{t}</strong>
                <span>：{tierMeta[t].proportion}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 专业组数据表：react-virtualized 虚拟列表，仅渲染可见 DOM 节点 */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {/* 表头（固定不滚动） */}
          <div className="grid grid-cols-[0.5fr_1.5fr_2.5fr_0.8fr_1fr_1fr_1fr_1fr_0.8fr] gap-1 bg-white/5 text-slate-300 font-bold border-b border-white/10 text-[0.6875rem] px-3 py-2">
            <span className="text-center whitespace-nowrap">梯队</span>
            <span className="whitespace-nowrap">院校名称</span>
            <span>专业名称</span>
            <span className="text-center whitespace-nowrap">专业组代码</span>
            <span className="text-center whitespace-nowrap">
              院校专业组代码
            </span>
            <span className="text-center whitespace-nowrap">批次</span>
            <span className="text-center whitespace-nowrap">
              专业录取最低分
            </span>
            <span className="text-center whitespace-nowrap">专业最低位次</span>
            <span className="text-center whitespace-nowrap">录取人数</span>
          </div>

          {!groupData ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              正在加载专业录取数据，请稍候…
            </div>
          ) : filteredGroupData.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              未找到匹配的院校专业组，请调整筛选条件或搜索关键词。
            </div>
          ) : (
            <div style={{ height: 600 }}>
              <AutoSizer>
                {({ width, height }) => (
                  <List
                    width={width}
                    height={height}
                    rowCount={filteredGroupData.length}
                    rowHeight={52}
                    rowRenderer={(props: ListRowProps) => {
                      const g = filteredGroupData[props.index];
                      return (
                        <div
                          key={props.key}
                          style={props.style}
                          className="grid grid-cols-[0.5fr_1.5fr_2.5fr_0.8fr_1fr_1fr_1fr_1fr_0.8fr] gap-1 items-center border-b border-white/5 hover:bg-white/5 transition-all text-[0.6875rem] px-3"
                        >
                          <span className="text-center">
                            {g.tier ? (
                              <span
                                className={`text-[0.5625rem] px-1 py-0.5 rounded font-bold ${tierMeta[g.tier].badgeClass}`}
                              >
                                {g.tier}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </span>
                          <span
                            className="font-bold text-white truncate cursor-pointer hover:text-blue-300 transition-colors"
                            title={g.school}
                            onClick={(e) => {
                              const el = e.currentTarget as HTMLElement;
                              if (el.scrollWidth <= el.clientWidth) return; // 未截断不弹
                              const rect = el.getBoundingClientRect();
                              setCellPopover({
                                x: rect.left,
                                y: rect.bottom + 6,
                                text: g.school
                              });
                            }}
                          >
                            {g.school}
                          </span>
                          <span
                            className="text-slate-300 truncate cursor-pointer hover:text-blue-300 transition-colors"
                            title={g.majorName}
                            onClick={(e) => {
                              const el = e.currentTarget as HTMLElement;
                              if (el.scrollWidth <= el.clientWidth) return; // 未截断不弹
                              const rect = el.getBoundingClientRect();
                              setCellPopover({
                                x: rect.left,
                                y: rect.bottom + 6,
                                text: g.majorName
                              });
                            }}
                          >
                            {g.schoolUrl && (
                              <a
                                href={g.schoolUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="查看招生章程"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center shrink-0 text-slate-400 hover:text-blue-400 transition-colors align-[-3px] mr-0.5"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {g.majorName}
                          </span>
                          <span className="text-center font-mono text-slate-200">
                            {g.groupCode}
                          </span>
                          <span className="text-center font-mono text-slate-200">
                            {g.schoolGroupCode}
                          </span>
                          <span
                            className="text-center text-slate-300 truncate"
                            title={g.batch}
                          >
                            {g.batch}
                          </span>
                          <span className="text-center font-bold text-blue-400 bg-blue-500/5">
                            {g.minScore}
                          </span>
                          <span className="text-center font-semibold text-slate-200 bg-blue-500/5">
                            {g.minRank.toLocaleString()}
                          </span>
                          <span className="text-center font-mono text-emerald-300">
                            {g.admissionCount}
                          </span>
                        </div>
                      );
                    }}
                    overscanRowCount={10}
                  />
                )}
              </AutoSizer>
            </div>
          )}
        </div>
      </div>

      {/* 截断单元格完整内容气泡 */}
      <AnimatePresence>
        {cellPopover && (
          <motion.div
            data-cell-popover
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="fixed z-[60] max-w-[280px] bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl px-3 py-2 text-[0.6875rem] leading-relaxed text-slate-100 shadow-2xl"
            style={{
              left: Math.min(
                cellPopover.x,
                Math.max(8, window.innerWidth - 290)
              ),
              top:
                cellPopover.y + 90 > window.innerHeight
                  ? cellPopover.y - 90
                  : cellPopover.y
            }}
            onClick={() => setCellPopover(null)}
          >
            {cellPopover.text}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
