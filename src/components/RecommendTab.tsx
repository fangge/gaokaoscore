import { useState, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  ArrowUpDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  BookOpen,
  Plus,
  Minus,
  Activity,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import type { UniversityData, Subject, SchoolNature, AdmissionTier } from '../types';
import { classifyTier, tierMeta, tierOrder } from '../tierUtils';

interface RecommendTabProps {
  level: '本科' | '专科';
  setLevel: (l: '本科' | '专科') => void;
  subject: Subject;
  setSubject: (s: Subject) => void;
  currentDataset: UniversityData[];
  comparedSchools: string[];
  onToggleCompare: (name: string) => void;
}

type SortBy = 'rankAsc' | 'rankDesc' | 'scoreDesc' | 'scoreAsc' | 'name';

/**
 * 智能择校推荐与查询 Tab
 * - 顶部控制面板：本专科层次、选科、基准年份、排位/分数双向映射
 * - 院校列表 + 冲/稳/保 梯队筛选
 * - 右侧 3 年录取趋势深度走势图
 */
export default function RecommendTab({
  level,
  setLevel,
  subject,
  setSubject,
  currentDataset,
  comparedSchools,
  onToggleCompare
}: RecommendTabProps) {
  const [inputMode, setInputMode] = useState<'rank' | 'score'>('rank');
  const [userRankInput, setUserRankInput] = useState<string>('');
  const [userScoreInput, setUserScoreInput] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<2023 | 2024 | 2025>(2025);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNatures, setSelectedNatures] = useState<SchoolNature[]>(['公办', '民办', '合作办学']);
  const [sortBy, setSortBy] = useState<SortBy>('rankAsc');
  const [selectedTier, setSelectedTier] = useState<'all' | AdmissionTier>('all');

  const [selectedSchool, setSelectedSchool] = useState<UniversityData | null>(null);

  // Rank / Score Estimator utilities
  const estimatedRank = useMemo(() => {
    if (inputMode === 'rank') {
      const parsed = parseInt(userRankInput);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      const score = parseInt(userScoreInput);
      if (isNaN(score)) return 0;

      // Interpolate rank based on current year's data points
      const validPoints = currentDataset
        .map(univ => ({
          score: univ.history[selectedYear]?.score,
          rank: univ.history[selectedYear]?.rank
        }))
        .filter((pt): pt is { score: number; rank: number } => pt.score !== undefined && pt.score !== null && pt.rank !== undefined && pt.rank !== null)
        .sort((a, b) => b.score - a.score);

      if (validPoints.length === 0) return 50000;

      if (score >= validPoints[0].score) {
        // Better than top score -> estimate better rank proportionally
        const diffScore = score - validPoints[0].score;
        return Math.max(1, Math.round(validPoints[0].rank - diffScore * 50));
      }
      if (score <= validPoints[validPoints.length - 1].score) {
        // Worse than lowest score
        const diffScore = validPoints[validPoints.length - 1].score - score;
        return Math.round(validPoints[validPoints.length - 1].rank + diffScore * 1200);
      }

      for (let i = 0; i < validPoints.length - 1; i++) {
        const p1 = validPoints[i];
        const p2 = validPoints[i + 1];
        if (score <= p1.score && score >= p2.score) {
          if (p1.score === p2.score) return p1.rank;
          const ratio = (p1.score - score) / (p1.score - p2.score);
          return Math.round(p1.rank + ratio * (p2.rank - p1.rank));
        }
      }
      return 50000;
    }
  }, [inputMode, userRankInput, userScoreInput, currentDataset, selectedYear]);

  const estimatedScore = useMemo(() => {
    if (inputMode === 'score') {
      const parsed = parseInt(userScoreInput);
      return isNaN(parsed) ? 550 : parsed;
    } else {
      const rank = parseInt(userRankInput);
      if (isNaN(rank)) return 550;

      const validPoints = currentDataset
        .map(univ => ({
          score: univ.history[selectedYear]?.score,
          rank: univ.history[selectedYear]?.rank
        }))
        .filter((pt): pt is { score: number; rank: number } => pt.score !== undefined && pt.score !== null && pt.rank !== undefined && pt.rank !== null)
        .sort((a, b) => a.rank - b.rank); // smaller rank first

      if (validPoints.length === 0) return 550;

      if (rank <= validPoints[0].rank) {
        return Math.min(750, validPoints[0].score + Math.round((validPoints[0].rank - rank) * 0.005));
      }
      if (rank >= validPoints[validPoints.length - 1].rank) {
        return Math.max(100, validPoints[validPoints.length - 1].score - Math.round((rank - validPoints[validPoints.length - 1].rank) * 0.001));
      }

      for (let i = 0; i < validPoints.length - 1; i++) {
        const p1 = validPoints[i];
        const p2 = validPoints[i + 1];
        if (rank >= p1.rank && rank <= p2.rank) {
          if (p1.rank === p2.rank) return p1.score;
          const ratio = (rank - p1.rank) / (p2.rank - p1.rank);
          return Math.round(p1.score - ratio * (p1.score - p2.score));
        }
      }
      return 550;
    }
  }, [inputMode, userRankInput, userScoreInput, currentDataset, selectedYear]);

  // Toggle school nature selection
  const handleToggleNature = (nature: SchoolNature) => {
    if (selectedNatures.includes(nature)) {
      if (selectedNatures.length === 1) return; // keep at least one
      setSelectedNatures(prev => prev.filter(n => n !== nature));
    } else {
      setSelectedNatures(prev => [...prev, nature]);
    }
  };

  // 基础筛选数据：按名称、办学性质、分数/排位筛选，并附加冲/稳/保梯队（不含梯队筛选本身）
  const baseFilteredData = useMemo(() => {
    return currentDataset
      .filter(univ => {
        // Name Search
        const matchesSearch = univ.name.toLowerCase().includes(searchQuery.toLowerCase());
        // Nature filter
        const matchesNature = selectedNatures.includes(univ.nature);

        const minRank = univ.history[selectedYear]?.rank;
        const minScore = univ.history[selectedYear]?.score;
        if (minRank === null || minRank === undefined || minScore === null || minScore === undefined) {
          return false;
        }

        // 扩展至"冲"区间：纳入往年录取位次比当前高 5%-15% 的院校（minRank >= 排位 * 0.85）
        const matchesScoreOrRank = minScore <= estimatedScore || minRank >= estimatedRank * 0.85;
        return matchesSearch && matchesNature && matchesScoreOrRank;
      })
      .map(univ => ({
        ...univ,
        tier: classifyTier(univ.history[selectedYear]?.rank, estimatedRank),
      }));
  }, [currentDataset, searchQuery, selectedNatures, selectedYear, estimatedRank, estimatedScore]);

  // Processed and filtered data for table / search（在基础筛选之上叠加梯队筛选与排序）
  const processedData = useMemo(() => {
    return baseFilteredData
      .filter(item => selectedTier === 'all' || item.tier === selectedTier)
      .sort((a, b) => {
        const valA = a.history[selectedYear];
        const valB = b.history[selectedYear];

        if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'zh');
        }

        // Handle missing data points gracefully by pushing them to bottom
        const rankA = valA?.rank ?? 999999;
        const rankB = valB?.rank ?? 999999;
        const scoreA = valA?.score ?? -1;
        const scoreB = valB?.score ?? -1;

        if (sortBy === 'rankAsc') return rankA - rankB;
        if (sortBy === 'rankDesc') return rankB - rankA;
        if (sortBy === 'scoreDesc') return scoreB - scoreA;
        if (sortBy === 'scoreAsc') return scoreA - scoreB;
        return 0;
      });
  }, [baseFilteredData, selectedTier, sortBy, selectedYear]);

  // Micro statistics calculation（基于基础筛选数据，反映完整冲/稳/保分布）
  const stats = useMemo(() => {
    const totalCount = baseFilteredData.length;

    const natureCounts = baseFilteredData.reduce((acc, curr) => {
      acc[curr.nature] = (acc[curr.nature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tierCounts = baseFilteredData.reduce((acc, curr) => {
      if (curr.tier) acc[curr.tier] = (acc[curr.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalCount,
      publicCount: natureCounts['公办'] || 0,
      privateCount: natureCounts['民办'] || 0,
      jointCount: natureCounts['合作办学'] || 0,
      chongCount: tierCounts['冲'] || 0,
      wenCount: tierCounts['稳'] || 0,
      baoCount: tierCounts['保'] || 0,
    };
  }, [baseFilteredData]);

  // Individual school detailed historical trend compilation
  const selectedSchoolChartData = useMemo(() => {
    if (!selectedSchool) return [];
    return [2023, 2024, 2025].map(yr => ({
      year: `${yr}年`,
      score: selectedSchool.history[yr as keyof typeof selectedSchool.history]?.score,
      rank: selectedSchool.history[yr as keyof typeof selectedSchool.history]?.rank,
    }));
  }, [selectedSchool]);

  return (
    <>
      {/* Top Control Panel Grid */}
      <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col gap-6" id="control_panel">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between">

          {/* Subject Selector & Year Picker */}
          <div className="flex-1 flex flex-col md:flex-row gap-4">
            {/* Level Select Card */}
            <div className="flex-1 min-w-[160px] flex flex-col gap-2">
              <label className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                1. 本专科层次选择
              </label>
              <div className="grid grid-cols-2 p-1 bg-black/20 rounded-xl border border-white/5">
                <button
                  onClick={() => setLevel('本科')}
                  className={`py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${level === '本科'
                      ? 'bg-white/10 text-white shadow-md border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  本科批次
                </button>
                <button
                  onClick={() => setLevel('专科')}
                  className={`py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${level === '专科'
                      ? 'bg-white/10 text-white shadow-md border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  专科批次
                </button>
              </div>
            </div>

            {/* Subject Select Card */}
            <div className="flex-2 min-w-[280px] flex flex-col gap-2">
              <label className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                2. 选科与专业大类选择
              </label>
              <div className="flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
                <button
                  onClick={() => setSubject('physics')}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${subject === 'physics'
                      ? 'bg-blue-500/20 text-blue-200 shadow-md border border-blue-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                  物理
                </button>
                <button
                  onClick={() => setSubject('history')}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${subject === 'history'
                      ? 'bg-orange-500/20 text-orange-200 shadow-md border border-orange-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
                  历史
                </button>
                <button
                  onClick={() => setSubject('sports')}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${subject === 'sports'
                      ? 'bg-emerald-500/20 text-emerald-200 shadow-md border border-emerald-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  体育
                </button>
                <button
                  onClick={() => setSubject('art')}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${subject === 'art'
                      ? 'bg-purple-500/20 text-purple-200 shadow-md border border-purple-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                  美术
                </button>
                <button
                  onClick={() => setSubject('music')}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${subject === 'music'
                      ? 'bg-indigo-500/20 text-indigo-200 shadow-md border border-indigo-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                  音乐
                </button>
                <button
                  onClick={() => setSubject('acting')}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${subject === 'acting'
                      ? 'bg-rose-500/20 text-rose-200 shadow-md border border-rose-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                  表演
                </button>
                <button
                  onClick={() => setSubject('dance')}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${subject === 'dance'
                      ? 'bg-amber-500/20 text-amber-200 shadow-md border border-amber-500/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  舞蹈
                </button>
              </div>
            </div>

            {/* Year Select Card */}
            <div className="flex-1 min-w-[160px] flex flex-col gap-2">
              <label className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                3. 投档最低分基准年份
              </label>
              <div className="grid grid-cols-3 p-1 bg-black/20 rounded-xl border border-white/5">
                {([2025, 2024, 2023] as const).map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${selectedYear === year
                        ? 'bg-white/10 text-white shadow-md border border-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {year}年
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Score & Rank Smart Matcher */}
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-4 shadow-2xl relative">
            <div className="absolute top-2.5 right-3 flex items-center gap-1 text-[0.625rem] text-indigo-400 font-mono">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              双向高精度自动映射
            </div>

            <div className="w-full md:w-1/2 flex flex-col gap-1.5">
              <span className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wide">
                4. 输入全省排位或投档分
              </span>

              <div className="flex rounded-xl bg-black/20 border border-white/5 p-1">
                <button
                  onClick={() => setInputMode('rank')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${inputMode === 'rank' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  全省排位
                </button>
                <button
                  onClick={() => setInputMode('score')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${inputMode === 'score' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  投档分数
                </button>
              </div>
            </div>

            <div className="w-full md:w-1/2 flex items-center gap-3">
              {inputMode === 'rank' ? (
                <div className="flex-1 flex flex-col gap-1">
                  <div className="relative">
                    <input
                      type="number"
                      value={userRankInput}
                      onChange={(e) => setUserRankInput(e.target.value)}
                      placeholder="请输入全省位次..."
                      className="w-full bg-white/5 border border-white/20 focus:border-blue-500/80 rounded-xl py-2 px-3 text-lg font-bold text-blue-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-inner backdrop-blur-xl transition-all"
                      min="1"
                      pattern="[0-9]*"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">名</span>
                  </div>
                  <div className="text-[0.6875rem] text-slate-400 flex items-center gap-1 pl-1 font-sans">
                    <span>预估等值 {selectedYear} 年投档分：</span>
                    <strong className="text-blue-400 text-xs font-mono">{estimatedScore} 分</strong>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-1">
                  <div className="relative">
                    <input
                      type="number"
                      value={userScoreInput}
                      onChange={(e) => setUserScoreInput(e.target.value)}
                      placeholder="请输入高考分数..."
                      className="w-full bg-white/5 border border-white/20 focus:border-blue-500/80 rounded-xl py-2 px-3 text-lg font-bold text-blue-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-inner backdrop-blur-xl transition-all"
                      min="100"
                      max="750"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">分</span>
                  </div>
                  <div className="text-[0.6875rem] text-slate-400 flex items-center gap-1 pl-1 font-sans">
                    <span>预估等值 {selectedYear} 年排位：</span>
                    <strong className="text-blue-400 text-xs font-mono">{estimatedRank.toLocaleString()} 位</strong>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/20 rounded-2xl p-4 border border-white/5" id="quick_stats">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-md border-l-4 border-l-blue-500">
            <span className="text-[0.625rem] font-bold text-slate-400 block mb-0.5 uppercase tracking-wide">
              符合投档条件院校
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-white">{stats.total}</span>
              <span className="text-xs text-slate-400">所</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-md border-l-4 border-l-indigo-500">
            <span className="text-[0.625rem] font-bold text-indigo-400 block mb-0.5 uppercase tracking-wide">
              公办性质院校
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-white">{stats.publicCount}</span>
              <span className="text-xs text-slate-400">所</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-md border-l-4 border-l-amber-500">
            <span className="text-[0.625rem] font-bold text-amber-400 block mb-0.5 uppercase tracking-wide">
              民办性质院校
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-white">{stats.privateCount}</span>
              <span className="text-xs text-slate-400">所</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-md border-l-4 border-l-emerald-500">
            <span className="text-[0.625rem] font-bold text-emerald-400 block mb-0.5 uppercase tracking-wide">
              中外/合作办学
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-white">{stats.jointCount}</span>
              <span className="text-xs text-slate-400">所</span>
            </div>
          </div>
        </div>

        {/* 冲/稳/保 梯队分布与填报策略指引（点击卡片可按梯队筛选） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-black/20 rounded-2xl p-4 border border-white/5">
          {tierOrder.map(t => {
            const meta = tierMeta[t];
            const count = t === '冲' ? stats.chongCount : t === '稳' ? stats.wenCount : stats.baoCount;
            const isActive = selectedTier === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedTier(isActive ? 'all' : t)}
                className={`text-left bg-white/5 border-l-4 rounded-xl p-3 shadow-md transition-all cursor-pointer ${isActive ? `${meta.borderClass} ring-1 ring-white/20 bg-white/10` : `${meta.borderClass} border border-white/10 hover:bg-white/10`}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                    {meta.label}的院校
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-extrabold ${meta.countClass}`}>{count}</span>
                    <span className="text-[0.625rem] text-slate-400">所</span>
                  </div>
                </div>
                <p className="text-[0.625rem] text-slate-400 leading-relaxed">{meta.desc}</p>
                <p className="text-[0.625rem] text-slate-500 mt-1">建议占总志愿：{meta.proportion}</p>
              </button>
            );
          })}
        </div>
        {selectedTier !== 'all' && (
          <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2">
            <span className="text-xs text-blue-200">
              当前仅展示「{selectedTier}」梯队院校，点击上方对应卡片可恢复全部展示
            </span>
            <button
              onClick={() => setSelectedTier('all')}
              className="text-xs font-semibold text-blue-300 hover:text-white cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              清除梯队筛选
            </button>
          </div>
        )}
      </section>

      {/* TAB 1: RECOMMENDATIONS & SEARCH */}
      <div className="flex flex-col gap-6" id="tab_recommend">

        {/* Secondary filter & search drawer */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-5 flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between shadow-2xl rounded-3xl">

          {/* Search Bar */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入院校名称模糊查询..."
              className="w-full bg-white/5 border border-white/20 focus:border-blue-500/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-100 placeholder:text-slate-500 transition-all backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Multi filters & Toggles */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">

            {/* Nature Multi-selector */}
            <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/5">
              {(['公办', '民办', '合作办学'] as SchoolNature[]).map(nature => {
                const isSelected = selectedNatures.includes(nature);
                return (
                  <button
                    key={nature}
                    onClick={() => handleToggleNature(nature)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isSelected
                        ? 'bg-white/10 text-white shadow-md border border-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {nature}
                  </button>
                );
              })}
            </div>



            {/* Sorting */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-white/5 border border-white/20 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-200 cursor-pointer hover:border-white/30 transition-all [&_option]:bg-slate-950 [&_option]:text-slate-100"
              >
                <option value="rankAsc">按最低排位 (升序 - 最好在前)</option>
                <option value="rankDesc">按最低排位 (降序 - 最易在前)</option>
                <option value="scoreDesc">按最低投档分 (降序 - 最高在前)</option>
                <option value="scoreAsc">按最低投档分 (升序 - 最低在前)</option>
                <option value="name">按拼音/名称首字母排序</option>
              </select>
            </div>

          </div>

        </div>

        {/* Matching College List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="matching_layout">

          {/* School List Panel (Left 2 columns) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                符合筛选条件的省内院校 ({processedData.length} 所)
              </h3>
              <span className="text-xs text-slate-500">
                点击卡片可查看 3 年深度录取走势图
              </span>
            </div>

            {processedData.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">未找到匹配院校</h4>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    尝试降低分数/排位筛选、清除部分检索关键词，或将“办学性质”及“梯队分类”复位。
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {processedData.map((univ) => {
                  const isCompared = comparedSchools.includes(univ.name);
                  const isSelected = selectedSchool?.name === univ.name;
                  const currentYearData = univ.history[selectedYear];

                  return (
                    <div
                      key={univ.name}
                      onClick={() => setSelectedSchool(univ)}
                      className={`bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl backdrop-blur-xl ${isSelected
                          ? 'bg-blue-500/10 border border-blue-500/20 scale-[1.01] shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                          : 'border border-white/5'
                        }`}
                    >
                      <div className="flex-1 flex gap-3.5 items-start">
                        {/* School Icon */}
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-300 border border-blue-500/20 shadow-xs shrink-0">
                          <GraduationCap className="w-5 h-5 text-blue-400" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-bold text-white text-base leading-snug">
                              {univ.name}
                            </h4>
                            <span className={`text-[0.625rem] px-1.5 py-0.5 rounded font-semibold ${univ.nature === '公办' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                univ.nature === '民办' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  'bg-white/5 text-slate-300 border border-white/10'
                              }`}>
                              {univ.nature}
                            </span>
                            {univ.tier && (
                              <span className={`text-[0.625rem] px-1.5 py-0.5 rounded font-bold ${tierMeta[univ.tier].badgeClass}`}>
                                {univ.tier}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400 font-mono">
                            <div>
                              {selectedYear}年投档分：
                              <strong className="text-white font-semibold">{currentYearData?.score ?? '无'}</strong>
                            </div>
                            <div>
                              投档最低排位：
                              <strong className="text-white font-semibold">
                                {currentYearData?.rank ? currentYearData.rank.toLocaleString() : '无'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions / Compare and view */}
                      <div className="flex items-center gap-2 self-end md:self-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onToggleCompare(univ.name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${isCompared
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                            }`}
                        >
                          {isCompared ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {isCompared ? '取消对比' : '加入对比'}
                        </button>

                        <button
                          onClick={() => setSelectedSchool(univ)}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition-all cursor-pointer"
                          title="查看走势图"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected School Detail Trend Widget (Right 1 column) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              院校3载录取趋势深度走势
            </h3>

            {selectedSchool ? (
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-5 sticky top-6">

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.625rem] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold">
                        {selectedSchool.nature}
                      </span>
                      {(() => {
                        const t = classifyTier(selectedSchool.history[selectedYear]?.rank, estimatedRank);
                        return t ? (
                          <span className={`text-[0.625rem] px-1.5 py-0.5 rounded font-bold ${tierMeta[t].badgeClass}`}>
                            {t}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-xs text-slate-400 font-semibold font-mono">3年数据深度研判</span>
                    </div>
                    <h4 className="font-extrabold text-white text-lg mt-1">
                      {selectedSchool.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedSchool(null)}
                    className="p-1 text-slate-400 hover:text-white bg-white/5 border border-white/10 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Admission Eligibility Banner */}
                {(() => {
                  const schoolMinRank = selectedSchool.history[selectedYear]?.rank;
                  const schoolMinScore = selectedSchool.history[selectedYear]?.score;
                  const isEligible = schoolMinScore !== undefined && schoolMinScore !== null && schoolMinRank !== undefined && schoolMinRank !== null
                    ? (schoolMinScore <= estimatedScore || schoolMinRank >= estimatedRank)
                    : false;

                  return isEligible ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 to-indigo-500/5 border border-blue-500/20 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-bold block leading-none mb-1">录取符合性</span>
                        <span className="text-sm font-extrabold text-blue-300">
                          当前成绩满足该校历年最低投档要求
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-500/5 to-slate-500/5 border border-white/5 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-slate-400 border border-white/10 shrink-0">
                        <Info className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-bold block leading-none mb-1">录取符合性</span>
                        <span className="text-sm font-extrabold text-slate-300">
                          非当前成绩匹配年份，请参考历年走势
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Line Charts (Score & Rank) */}
                <div className="flex flex-col gap-4">

                  {/* 1. Score trend chart */}
                  <div>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      最低投档分数变化曲线 (2023 - 2025)
                    </span>

                    <div className="h-44 w-full bg-black/25 rounded-xl p-2 border border-white/5">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={selectedSchoolChartData}
                          margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                          <XAxis dataKey="year" tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis domain={['dataMin - 15', 'dataMax + 15']} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }}
                            formatter={(value) => [`${value} 分`, '投档最低分']}
                          />
                          <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 2. Ranking trend chart (Reversed axis) */}
                  <div>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      投档最低排位走势 (越往上排位越高/越难)
                    </span>

                    <div className="h-44 w-full bg-black/25 rounded-xl p-2 border border-white/5">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={selectedSchoolChartData}
                          margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                          <XAxis dataKey="year" tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          {/* Reversed axis for Gaokao rank! */}
                          <YAxis reversed tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }}
                            formatter={(value) => [`第 ${value?.toLocaleString()} 位`, '最低录取位次']}
                          />
                          <Line type="monotone" dataKey="rank" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Micro table detail */}
                <table className="w-full text-xs text-left border-collapse font-mono" id="selected_detail_table">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-bold">
                      <th className="pb-1.5">年份</th>
                      <th className="pb-1.5 text-center">最低分</th>
                      <th className="pb-1.5 text-right">最低排位</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[2023, 2024, 2025].map(yr => {
                      const yrData = selectedSchool.history[yr as keyof typeof selectedSchool.history];
                      const isCurrentBase = yr === selectedYear;
                      return (
                        <tr
                          key={yr}
                          className={`border-b border-white/5 last:border-b-0 ${isCurrentBase ? 'bg-indigo-500/15 font-bold text-white' : 'text-slate-300'
                            }`}
                        >
                          <td className="py-2">{yr}年 {isCurrentBase && <span className="text-[0.5625rem] bg-indigo-500/20 text-indigo-300 px-1 rounded border border-indigo-500/30">基准</span>}</td>
                          <td className="py-2 text-center">{yrData?.score ?? '—'} 分</td>
                          <td className="py-2 text-right">{yrData?.rank ? yrData.rank.toLocaleString() : '—'} 位</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl border border-dashed border-white/15 rounded-3xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-md">
                  <Info className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs max-w-[200px] leading-relaxed">
                  在左侧列表中点击任意院校卡片，即可在此呈现 2023-2025 年录取波动趋势曲线和历年数据速查表。
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </>
  );
}
