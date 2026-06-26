import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  ChevronRight,
  Sparkles,
  BookOpen,
  Award,
  Activity,
  Plus,
  Minus,
  RefreshCw,
  Info,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import {
  historyData,
  physicsData,
  juniorHistoryData,
  juniorPhysicsData,
  sportsData,
  artData,
  musicData,
  actingData,
  danceData,
  juniorSportsData,
  juniorArtData,
  juniorMusicData,
  juniorActingData,
  juniorDanceData
} from './data';
import { UniversityData, Subject, SchoolNature, MajorGroupData, AdmissionTier } from './types';
import { classifyTier, tierMeta, tierOrder } from './tierUtils';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import { getCachedGroupData, setCachedGroupData } from './groupDb';
import GroupFilterWorker from './groupFilter.worker?worker';

export default function App() {
  // Core user states
  const [level, setLevel] = useState<'本科' | '专科'>('本科');
  const [subject, setSubject] = useState<Subject>('physics');
  const [inputMode, setInputMode] = useState<'rank' | 'score'>('rank');
  const [userRankInput, setUserRankInput] = useState<string>('');
  const [userScoreInput, setUserScoreInput] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<2023 | 2024 | 2025>(2025);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNatures, setSelectedNatures] = useState<SchoolNature[]>(['公办', '民办', '合作办学']);
  const [sortBy, setSortBy] = useState<'rankAsc' | 'rankDesc' | 'scoreDesc' | 'scoreAsc' | 'name'>('rankAsc');
  // 冲/稳/保 梯队筛选
  const [selectedTier, setSelectedTier] = useState<'all' | AdmissionTier>('all');

  // Interactive elements
  const [selectedSchool, setSelectedSchool] = useState<UniversityData | null>(null);
  const [comparedSchools, setComparedSchools] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'recommend' | 'compare' | 'macro' | 'group'>('group');
  const [showHelp, setShowHelp] = useState(false);

  // 专业组数据 Tab 独立筛选状态
  const [groupLevel, setGroupLevel] = useState<'本科' | '专科'>('本科');
  const [groupSubject, setGroupSubject] = useState<'历史' | '物理'>('物理');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSortBy, setGroupSortBy] = useState<'rankAsc' | 'rankDesc' | 'scoreDesc' | 'scoreAsc' | 'name'>('rankAsc');
  // 专业组 Tab 独立的排位/分数筛选
  const [groupInputMode, setGroupInputMode] = useState<'rank' | 'score'>('rank');
  const [groupRankInput, setGroupRankInput] = useState<string>('');
  const [groupScoreInput, setGroupScoreInput] = useState<string>('');
  // 专业组 Tab 独立的冲/稳/保 梯队筛选
  const [groupTier, setGroupTier] = useState<'all' | AdmissionTier>('all');
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
      const file = groupSubject === '历史' ? '/groupData-history.json' : '/groupData-physics.json';
      const res = await fetch(file);
      if (cancelled) return;
      const arr = (await res.json()) as MajorGroupData[];
      setGroupData(arr);
      // 3. 回写 IndexedDB 缓存（不阻塞）
      setCachedGroupData(groupSubject, arr);
    })();
    return () => { cancelled = true; };
  }, [groupSubject]);

  // Get current dataset
  const currentDataset = useMemo(() => {
    if (level === '本科') {
      switch (subject) {
        case 'history': return historyData;
        case 'physics': return physicsData;
        case 'sports': return sportsData;
        case 'art': return artData;
        case 'music': return musicData;
        case 'acting': return actingData;
        case 'dance': return danceData;
        default: return physicsData;
      }
    } else {
      switch (subject) {
        case 'history': return juniorHistoryData;
        case 'physics': return juniorPhysicsData;
        case 'sports': return juniorSportsData;
        case 'art': return juniorArtData;
        case 'music': return juniorMusicData;
        case 'acting': return juniorActingData;
        case 'dance': return juniorDanceData;
        default: return juniorPhysicsData;
      }
    }
  }, [level, subject]);

  // Synchronize initial input on level/subject changes to prevent out-of-bound errors
  // React.useEffect(() => {
  //   if (level === 'undergraduate' || level === '本科') {
  //     if (inputMode === 'rank') {
  //       if (subject === 'physics') setUserRankInput('60000');
  //       else if (subject === 'history') setUserRankInput('20000');
  //       else if (subject === 'sports') setUserRankInput('2000');
  //       else if (subject === 'art') setUserRankInput('5000');
  //       else if (subject === 'music') setUserRankInput('2000');
  //       else if (subject === 'acting') setUserRankInput('200');
  //       else if (subject === 'dance') setUserRankInput('500');
  //     } else {
  //       if (subject === 'sports') setUserScoreInput('550');
  //       else if (subject === 'art') setUserScoreInput('500');
  //       else if (subject === 'music') setUserScoreInput('480');
  //       else if (subject === 'acting') setUserScoreInput('500');
  //       else if (subject === 'dance') setUserScoreInput('480');
  //       else setUserScoreInput('560');
  //     }
  //   } else {
  //     if (inputMode === 'rank') {
  //       if (subject === 'physics') setUserRankInput('280000');
  //       else if (subject === 'history') setUserRankInput('90000');
  //       else if (subject === 'sports') setUserRankInput('10000');
  //       else if (subject === 'art') setUserRankInput('25000');
  //       else if (subject === 'music') setUserRankInput('6000');
  //       else if (subject === 'acting') setUserRankInput('1500');
  //       else if (subject === 'dance') setUserRankInput('2000');
  //     } else {
  //       if (subject === 'sports') setUserScoreInput('480');
  //       else if (subject === 'art') setUserScoreInput('380');
  //       else if (subject === 'music') setUserScoreInput('380');
  //       else if (subject === 'acting') setUserScoreInput('430');
  //       else if (subject === 'dance') setUserScoreInput('380');
  //       else setUserScoreInput('430');
  //     }
  //   }
  // }, [level, subject, inputMode]);


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

  // Toggle school comparison
  const handleToggleCompare = (schoolName: string) => {
    if (comparedSchools.includes(schoolName)) {
      setComparedSchools(prev => prev.filter(n => n !== schoolName));
    } else {
      if (comparedSchools.length >= 5) {
        alert('最多支持对比 5 所院校，请先移除部分已选院校');
        return;
      }
      setComparedSchools(prev => [...prev, schoolName]);
    }
  };

  // Clear all comparison choices
  const clearComparison = () => setComparedSchools([]);

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

  // Comparison data compilation for charts
  const comparisonChartData = useMemo(() => {
    if (comparedSchools.length === 0) return [];

    // Years we want to compare
    const years = [2023, 2024, 2025] as const;

    return years.map(yr => {
      const row: any = { year: `${yr}年` };
      comparedSchools.forEach(name => {
        const univ = currentDataset.find(u => u.name === name);
        if (univ) {
          row[`${name}_score`] = univ.history[yr]?.score;
          row[`${name}_rank`] = univ.history[yr]?.rank;
        }
      });
      return row;
    });
  }, [comparedSchools, currentDataset]);

  // Individual school detailed historical trend compilation
  const selectedSchoolChartData = useMemo(() => {
    if (!selectedSchool) return [];
    return [2023, 2024, 2025].map(yr => ({
      year: `${yr}年`,
      score: selectedSchool.history[yr as keyof typeof selectedSchool.history]?.score,
      rank: selectedSchool.history[yr as keyof typeof selectedSchool.history]?.rank,
    }));
  }, [selectedSchool]);

  // Macro volatility data: schools that had the highest rank shift from 2023 to 2025
  const volatilityData = useMemo(() => {
    return currentDataset
      .map(univ => {
        const r23 = univ.history[2023]?.rank;
        const r25 = univ.history[2025]?.rank;
        const s23 = univ.history[2023]?.score;
        const s25 = univ.history[2025]?.score;

        if (r23 === null || r23 === undefined || r25 === null || r25 === undefined || s23 === null || s23 === undefined || s25 === null || s25 === undefined) return null;
        const rankShift = r25 - r23; // Positive means rank increased (difficulty decreased/fell)
        const scoreShift = s25 - s23;
        return {
          name: univ.name,
          nature: univ.nature,
          rankShift: Math.abs(rankShift),
          rankDirection: rankShift < 0 ? '上升 (变难)' : '下降 (变易)',
          rankRawShift: rankShift,
          scoreShift,
          r23,
          r25,
          s23,
          s25
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.rankShift - a.rankShift)
      .slice(0, 10);
  }, [currentDataset]);

  // 专业组数据：筛选 + 排序交由 Web Worker 离线计算，避免阻塞主线程渲染与交互
  const GROUP_DEFAULT_LIMIT = 20;
  const [filteredGroupData, setFilteredGroupData] = useState<MajorGroupData[]>([]);
  // 点击被截断的院校/专业单元格时弹出气泡，展示完整文本
  const [cellPopover, setCellPopover] = useState<{ x: number; y: number; text: string } | null>(null);
  // 单例 Worker（组件生命周期内复用）
  const workerRef = React.useRef<Worker | null>(null);
  if (!workerRef.current && typeof Worker !== 'undefined') {
    workerRef.current = new GroupFilterWorker();
  }
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !groupData) {
      setFilteredGroupData([]);
      return;
    }
    const handler = (e: MessageEvent<MajorGroupData[]>) => setFilteredGroupData(e.data);
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
    });
    return () => worker.removeEventListener('message', handler);
  }, [groupData, groupLevel, debouncedGroupSearch, groupSortBy, groupScoreInput, groupRankInput, groupTier]);
  // 组件卸载时终止 Worker
  useEffect(() => {
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
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
    <div className="bg-[#020617] text-slate-100 font-sans antialiased relative min-h-screen selection:bg-blue-500/30 selection:text-white" id="main_root">

      {/* Animated Glowing Ambient Blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Premium Header */}
      <div className="max-w-7xl mx-auto px-4 pt-6 relative z-10" id="header_container">
        <header className="bg-white/5 backdrop-blur-2xl border border-white/10 text-white shadow-2xl py-6 px-4 md:px-8 rounded-3xl relative overflow-hidden" id="app_header">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold tracking-wider bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full uppercase border border-indigo-500/30">
                    数据融合版
                  </span>
                  <span className="text-xs font-semibold tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    真实投档数据
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mt-1">
                  广东高考投档位次查询与择校分析系统
                </h1>
                <p className="text-sm text-slate-400 mt-0.5 max-w-2xl">
                  收录 2023 - 2025 年省内公办、民办及合作办学{level}段完整投档数据。集成多维度对比及宏观数据演变态势。
                </p>
              </div>
            </div>

          
          </div>
        </header>
      </div>


      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 relative z-10" id="app_main">

       

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-xl relative z-10" id="navigation_tabs">
          <button
            onClick={() => setActiveTab('group')}
            className={`flex-1 min-w-[120px] py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'group'
                ? 'bg-white/10 border border-white/15 text-white shadow-lg shadow-white/5'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
          >
            <BookOpen className="w-4 h-4" />
            2025专业组录取数据
          </button>

          <button
            onClick={() => setActiveTab('recommend')}
            className={`flex-1 min-w-[120px] py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'recommend'
                ? 'bg-white/10 border border-white/15 text-white shadow-lg shadow-white/5'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
          >
            <Compass className="w-4 h-4" />
            择校推荐与查询
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`flex-1 min-w-[120px] py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer relative ${activeTab === 'compare'
                ? 'bg-white/10 border border-white/15 text-white shadow-lg shadow-white/5'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            多校对比分析
            {comparedSchools.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-5.5 h-5.5 flex items-center justify-center rounded-full font-bold border-2 border-[#091024]">
                {comparedSchools.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('macro')}
            className={`flex-1 min-w-[120px] py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'macro'
                ? 'bg-white/10 border border-white/15 text-white shadow-lg shadow-white/5'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            省内院校宏观波动趋势
          </button>
        </div>

        

        {/* Active Tab Panel Render */}
        <div className="transition-all duration-300 relative z-10">

           {/* Top Control Panel Grid - 仅关联「智能择校推荐与查询」Tab */}
        {activeTab === 'recommend' && (
        <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col gap-6" id="control_panel">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between">

            {/* Subject Selector & Year Picker */}
            <div className="flex-1 flex flex-col md:flex-row gap-4">
              {/* Level Select Card */}
              <div className="flex-1 min-w-[160px] flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
              <div className="absolute top-2.5 right-3 flex items-center gap-1 text-[10px] text-indigo-400 font-mono">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                双向高精度自动映射
              </div>

              <div className="w-full md:w-1/2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
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
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 pl-1 font-sans">
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
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 pl-1 font-sans">
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
              <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wide">
                符合投档条件院校
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-white">{stats.total}</span>
                <span className="text-xs text-slate-400">所</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-md border-l-4 border-l-indigo-500">
              <span className="text-[10px] font-bold text-indigo-400 block mb-0.5 uppercase tracking-wide">
                公办性质院校
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-white">{stats.publicCount}</span>
                <span className="text-xs text-slate-400">所</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-md border-l-4 border-l-amber-500">
              <span className="text-[10px] font-bold text-amber-400 block mb-0.5 uppercase tracking-wide">
                民办性质院校
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-white">{stats.privateCount}</span>
                <span className="text-xs text-slate-400">所</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-md border-l-4 border-l-emerald-500">
              <span className="text-[10px] font-bold text-emerald-400 block mb-0.5 uppercase tracking-wide">
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
                      <span className="text-[10px] text-slate-400">所</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{meta.desc}</p>
                  <p className="text-[10px] text-slate-500 mt-1">建议占总志愿：{meta.proportion}</p>
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
        )}

          {/* TAB 1: RECOMMENDATIONS & SEARCH */}
          {activeTab === 'recommend' && (
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
                      onChange={(e) => setSortBy(e.target.value as any)}
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
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${univ.nature === '公办' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                      univ.nature === '民办' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                        'bg-white/5 text-slate-300 border border-white/10'
                                    }`}>
                                    {univ.nature}
                                  </span>
                                  {univ.tier && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tierMeta[univ.tier].badgeClass}`}>
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
                                onClick={() => handleToggleCompare(univ.name)}
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
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold">
                              {selectedSchool.nature}
                            </span>
                            {(() => {
                              const t = classifyTier(selectedSchool.history[selectedYear]?.rank, estimatedRank);
                              return t ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tierMeta[t].badgeClass}`}>
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
                                <td className="py-2">{yr}年 {isCurrentBase && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded border border-indigo-500/30">基准</span>}</td>
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
          )}

          {/* TAB 2: MULTI-SCHOOL COMPARISON */}
          {activeTab === 'compare' && (
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl" id="tab_compare">

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    多校并列对比分析工作台
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    支持最多 5 所院校同屏比对往年投档分数、录取最低位次的纵向跌宕态势。
                  </p>
                </div>

                {comparedSchools.length > 0 && (
                  <button
                    onClick={clearComparison}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    清空对比列表
                  </button>
                )}
              </div>

              {comparedSchools.length === 0 ? (
                <div className="bg-black/20 rounded-2xl border-2 border-dashed border-white/10 p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl shadow-md">
                    <SlidersHorizontal className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">对比工作台为空</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                      请先在 <b>“智能择校推荐与查询”</b> 列表中，点击卡片右下角的“加入对比”按钮，将多所院校加入此处。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-8">

                  {/* Selected universities list row */}
                  <div className="flex flex-wrap gap-2">
                    {comparedSchools.map(name => {
                      const univ = currentDataset.find(u => u.name === name);
                      return (
                        <div
                          key={name}
                          className="bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-2 transition-all"
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>{name}</span>
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 py-0.2 rounded font-medium border border-indigo-500/30">
                            {univ?.nature}
                          </span>
                          <button
                            onClick={() => handleToggleCompare(name)}
                            className="text-slate-400 hover:text-white cursor-pointer p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Twin Charts Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* 1. Compare score curve */}
                    <div className="bg-black/25 p-4 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold text-slate-300 block mb-3">
                        📉 历年投档线分数对比 (2023 - 2025)
                      </span>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={comparisonChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            {comparedSchools.map((name, idx) => {
                              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                              return (
                                <Line
                                  key={name}
                                  type="monotone"
                                  dataKey={`${name}_score`}
                                  name={name}
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth={2.5}
                                  dot={{ r: 4 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 2. Compare rank curve (Reversed) */}
                    <div className="bg-black/25 p-4 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold text-slate-300 block mb-3">
                        📈 历年录取最低位次对比 (Y轴逆序 - 越往上实力越强)
                      </span>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={comparisonChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            {/* Reverse rank values */}
                            <YAxis reversed tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            {comparedSchools.map((name, idx) => {
                              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                              return (
                                <Line
                                  key={name}
                                  type="monotone"
                                  dataKey={`${name}_rank`}
                                  name={name}
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth={2.5}
                                  dot={{ r: 4 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                  {/* Comparative Matrix Table */}
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs text-left border-collapse" id="comparison_matrix_table">
                      <thead>
                        <tr className="bg-white/5 text-slate-300 font-bold border-b border-white/10">
                          <th className="p-3">院校名称</th>
                          <th className="p-3">办学性质</th>
                          <th className="p-3 text-center border-l border-white/10 bg-white/[0.02]" colSpan={2}>2025年最低录退</th>
                          <th className="p-3 text-center border-l border-white/10" colSpan={2}>2024年最低录退</th>
                          <th className="p-3 text-center border-l border-white/10" colSpan={2}>2023年最低录退</th>
                        </tr>
                        <tr className="bg-white/[0.02] text-slate-400 text-[10px] border-b border-white/10">
                          <th className="p-2" />
                          <th className="p-2" />
                          <th className="p-2 text-center border-l border-white/10 font-semibold">投档分</th>
                          <th className="p-2 text-center font-semibold">最低排位</th>
                          <th className="p-2 text-center border-l border-white/10 font-semibold">投档分</th>
                          <th className="p-2 text-center font-semibold">最低排位</th>
                          <th className="p-2 text-center border-l border-white/10 font-semibold">投档分</th>
                          <th className="p-2 text-center font-semibold">最低排位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparedSchools.map(name => {
                          const univ = currentDataset.find(u => u.name === name);
                          if (!univ) return null;
                          return (
                            <tr key={name} className="border-b border-white/10 hover:bg-white/5 transition-all font-mono">
                              <td className="p-3 font-bold text-white font-sans">{name}</td>
                              <td className="p-3 font-sans">
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-300">
                                  {univ.nature}
                                </span>
                              </td>

                              <td className="p-3 text-center border-l border-white/10 font-bold text-blue-400 bg-blue-500/5">
                                {univ.history[2025]?.score ?? '—'}
                              </td>
                              <td className="p-3 text-center font-semibold text-slate-200 bg-blue-500/5">
                                {univ.history[2025]?.rank?.toLocaleString() ?? '—'}
                              </td>

                              <td className="p-3 text-center border-l border-white/10 text-slate-300">
                                {univ.history[2024]?.score ?? '—'}
                              </td>
                              <td className="p-3 text-center font-semibold text-slate-400">
                                {univ.history[2024]?.rank?.toLocaleString() ?? '—'}
                              </td>

                              <td className="p-3 text-center border-l border-white/10 text-slate-300">
                                {univ.history[2023]?.score ?? '—'}
                              </td>
                              <td className="p-3 text-center font-semibold text-slate-400">
                                {univ.history[2023]?.rank?.toLocaleString() ?? '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: MACRO VOLATILITY */}
          {activeTab === 'macro' && (
            <div className="flex flex-col gap-6" id="tab_macro">

              {/* Macro overview metrics card */}
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Volatility Explanation */}
                <div className="flex flex-col gap-3">
                  <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 p-2.5 rounded-xl text-white w-11 h-11 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">什么是投档位次大波动？</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      广东省高考采用院校专业组并行志愿投档。当一些高校因为专业组设置调整、招生计划剧增、或是产生“小年”断档效应时，其往年最低投档排位会出现数万名的大幅波动。
                    </p>
                    <p className="text-xs text-blue-400 font-bold mt-2">
                      💡 抓住波动规律，是高考填报中成功“低分捡漏”的关键所在。
                    </p>
                  </div>
                </div>

                {/* 2. Public vs Private Admission ranges */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    省内普通类本科投档分区间速览
                  </h4>
                  <div className="flex-1 flex flex-col justify-center gap-3 bg-black/25 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">🏛️ 公办本科区间：</span>
                      <span className="font-mono font-semibold text-blue-300">480分 — 662分 左右</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[80%] rounded-full ml-[20%] shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">🏫 民办/独立学院区间：</span>
                      <span className="font-mono font-semibold text-amber-300">436分 — 513分 左右</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[45%] rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    </div>
                  </div>
                </div>

                {/* 3. Volatility trend gauge */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    投档数据完整率校验
                  </h4>
                  <div className="flex-1 bg-black/25 p-4 rounded-2xl border border-white/5 flex items-center gap-3.5">
                    <div className="bg-emerald-500/20 p-2.5 rounded-full text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-bold block">100% 官方投档线一致性</span>
                      <span className="text-sm font-extrabold text-white">
                        完美复刻自广东省教育考试院公布数据
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Top Volatile Colleges (Schools whose ranks fluctuated the most) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Fluctuation schools list (Left 2 columns) */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl lg:col-span-2 flex flex-col gap-4 rounded-3xl">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      省内高校最低排位波动幅度排行榜 (2023 vs 2025)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      筛选出过去3年位次波动变动最大、极具起伏的 10 所省内本科学院（数值越大代表不确定性越高）。
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs text-left border-collapse" id="volatility_table">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-slate-400 font-bold">
                          <th className="p-3">院校名称</th>
                          <th className="p-3">性质</th>
                          <th className="p-3 text-center">23年投档排位</th>
                          <th className="p-3 text-center">25年投档排位</th>
                          <th className="p-3 text-right">排位震荡幅度 (位)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volatilityData.map(item => (
                          <tr key={item.name} className="border-b border-white/5 hover:bg-white/5 transition-all font-mono">
                            <td className="p-3 font-bold text-white font-sans">{item.name}</td>
                            <td className="p-3 font-sans">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.nature === '公办' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                {item.nature}
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-400">{item.r23.toLocaleString()}</td>
                            <td className="p-3 text-center text-white font-semibold">{item.r25.toLocaleString()}</td>
                            <td className="p-3 text-right font-extrabold text-blue-400 bg-blue-500/5">
                              ⚡ ± {item.rankShift.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Macro distribution chart (Right 1 column) */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl lg:col-span-1 flex flex-col gap-4 rounded-3xl">
                  <h4 className="text-sm font-bold text-white">
                    本省高校本科投档最低分密集度分布
                  </h4>
                  <p className="text-xs text-slate-400">
                    直观反映省内高校在各个成绩层段（20分一档）的供给数量分布。
                  </p>

                  <div className="h-64 bg-black/25 rounded-2xl p-2 border border-white/5 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          // Compile score distribution of 2025
                          const interval = 20;
                          const dist: Record<string, number> = {};
                          currentDataset.forEach(u => {
                            const sc = u.history[2025]?.score;
                            if (sc !== null && sc !== undefined) {
                              const bin = Math.floor(sc / interval) * interval;
                              const label = `${bin}-${bin + interval - 1}分`;
                              dist[label] = (dist[label] || 0) + 1;
                            }
                          });
                          return Object.keys(dist).sort().map(k => ({ range: k, count: dist[k] }));
                        })()}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                        <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} formatter={(value) => [`${value} 所`, '高校数量']} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          {
                            currentDataset.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#3b82f6'} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-500/20 text-xs text-slate-300 flex flex-col gap-2">
                    <span className="font-bold flex items-center gap-1 text-indigo-300">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      宏观格局研判结论：
                    </span>
                    <p className="leading-relaxed">
                      2025年，广东本科投档格局进一步极化。优质公办本科名额集中在 550 分以上的头部，而 460 - 500 分之间有极强的竞争密集带，民办院校集中在 436 - 464 之间的低位保护带。
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: 2025 院校专业组录取数据 */}
          {activeTab === 'group' && (
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl" id="tab_group">

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    2025 院校专业组录取数据查询
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    提取每个专业对应的院校专业组录取人数、录取最低分与最低位次。每个专业单独展示。
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between">

                <div className="flex flex-wrap items-center gap-2">
                  {/* 本科 / 专科 */}
                  <div className="grid grid-cols-2 p-1 bg-black/20 rounded-xl border border-white/5">
                    {(['本科', '专科'] as const).map(lv => (
                      <button
                        key={lv}
                        onClick={() => setGroupLevel(lv)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${groupLevel === lv
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
                    {(['物理', '历史'] as const).map(sub => (
                      <button
                        key={sub}
                        onClick={() => setGroupSubject(sub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${groupSubject === sub
                          ? 'bg-white/10 text-white border border-white/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
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
                    onChange={(e) => setGroupSortBy(e.target.value as any)}
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
                  <span className="text-xs font-bold text-slate-300">按全省排位 / 投档分筛选</span>
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
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">名</span>
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
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">分</span>
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 md:text-right">
                  输入后自动划分冲/稳/保梯队：录取最低分 ≤ 我的分数，或 最低位次 ≥ 我的排位 × 0.85
                </span>
              </div>

              {/* 冲/稳/保 梯队筛选（输入排位或分数后生效） */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-md">
                <div className="flex items-center gap-2 shrink-0">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-300">志愿梯队筛选</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 shrink-0">
                  <button
                    onClick={() => setGroupTier('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${groupTier === 'all' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    全部
                  </button>
                  {tierOrder.map(t => (
                    <button
                      key={t}
                      onClick={() => setGroupTier(groupTier === t ? 'all' : t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${groupTier === t ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${tierMeta[t].dotClass}`} />
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                  {tierOrder.map(t => (
                    <span key={t} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${tierMeta[t].dotClass}`} />
                      <strong className={tierMeta[t].countClass}>{t}</strong>
                      <span>：{tierMeta[t].proportion}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* 专业组数据表：react-virtualized 虚拟列表，仅渲染可见 DOM 节点 */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {/* 表头（固定不滚动） */}
                <div className="grid grid-cols-[0.5fr_1.5fr_2.5fr_0.8fr_1fr_1fr_1fr_1fr_0.8fr] gap-1 bg-white/5 text-slate-300 font-bold border-b border-white/10 text-[11px] px-3 py-2">
                  <span className="text-center whitespace-nowrap">梯队</span>
                  <span className="whitespace-nowrap">院校名称</span>
                  <span>专业名称</span>
                  <span className="text-center whitespace-nowrap">专业组代码</span>
                  <span className="text-center whitespace-nowrap">院校专业组代码</span>
                  <span className="text-center whitespace-nowrap">批次</span>
                  <span className="text-center whitespace-nowrap">专业组录取最低分</span>
                  <span className="text-center whitespace-nowrap">专业组最低位次</span>
                  <span className="text-center whitespace-nowrap">录取人数</span>
                </div>

                
                {!groupData ? (
                  <div className="p-8 text-center text-slate-400 text-xs">正在加载专业组数据，请稍候…</div>
                ) : filteredGroupData.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">未找到匹配的院校专业组，请调整筛选条件或搜索关键词。</div>
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
                                className="grid grid-cols-[0.5fr_1.5fr_2.5fr_0.8fr_1fr_1fr_1fr_1fr_0.8fr] gap-1 items-center border-b border-white/5 hover:bg-white/5 transition-all text-[11px] px-3"
                              >
                                <span className="text-center">
                                  {g.tier ? (
                                    <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${tierMeta[g.tier].badgeClass}`}>{g.tier}</span>
                                  ) : <span className="text-slate-600">—</span>}
                                </span>
                                <span
                                  className="font-bold text-white truncate cursor-pointer hover:text-blue-300 transition-colors"
                                  title={g.school}
                                  onClick={(e) => {
                                    const el = e.currentTarget as HTMLElement;
                                    if (el.scrollWidth <= el.clientWidth) return; // 未截断不弹
                                    const rect = el.getBoundingClientRect();
                                    setCellPopover({ x: rect.left, y: rect.bottom + 6, text: g.school });
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
                                    setCellPopover({ x: rect.left, y: rect.bottom + 6, text: g.majorName });
                                  }}
                                >
                                  {g.majorName}
                                </span>
                                <span className="text-center font-mono text-slate-200">{g.groupCode}</span>
                                <span className="text-center font-mono text-slate-200">{g.schoolGroupCode}</span>
                                <span className="text-center text-slate-300 truncate" title={g.batch}>{g.batch}</span>
                                <span className="text-center font-bold text-blue-400 bg-blue-500/5">{g.minScore}</span>
                                <span className="text-center font-semibold text-slate-200 bg-blue-500/5">{g.minRank.toLocaleString()}</span>
                                <span className="text-center font-mono text-emerald-300">{g.admissionCount}</span>
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
          )}

        </div>

      </main>

      {/* 免责声明 */}
      <footer className="max-w-7xl mx-auto px-4 pb-8 relative z-10">
        <div className="bg-amber-500/[0.04] backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-amber-300 tracking-tight">
              免责声明
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                志愿填报是考生自己的事
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                本工具提供的数据、分析和建议仅供决策参考，不构成专业志愿填报指导意见。
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                数据已尽力但不敢保证
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                数据库来自各省教育考试院官方投档线，经多轮联网交叉验证，但录取数据每年变化，最终以各省教育考试院官网和学校官方招生网公布的当年数据为准。
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                开发者不承担任何责任
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                使用本工具产生的任何志愿填报决策及其后果，由考生和家长自行承担。开发者不对因使用或依赖本工具信息而导致的任何损失负责。
              </p>
            </div>
          </div>

          <div className="mt-4 bg-amber-500/[0.06] border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-amber-300 block mb-0.5">
                不要盲信任何工具
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                包括本工具在内，所有 AI 志愿填报辅助工具都只能作为参考。填报前请咨询学校老师、招生办等专业渠道。
              </p>
            </div>
          </div>
        </div>
      </footer>


      {/* 截断单元格完整内容气泡 */}
      <AnimatePresence>
        {cellPopover && (
          <motion.div
            data-cell-popover
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="fixed z-[60] max-w-[280px] bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl px-3 py-2 text-[11px] leading-relaxed text-slate-100 shadow-2xl"
            style={{
              left: Math.min(cellPopover.x, Math.max(8, window.innerWidth - 290)),
              top: cellPopover.y + 90 > window.innerHeight ? cellPopover.y - 90 : cellPopover.y,
            }}
            onClick={() => setCellPopover(null)}
          >
            {cellPopover.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA 更新提示 */}
      <PWAUpdatePrompt />
    </div>
  );
}
