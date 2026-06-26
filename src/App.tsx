import { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  Compass,
  SlidersHorizontal,
  TrendingUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
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
import type { Subject } from './types';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import RecommendTab from './components/RecommendTab';
import CompareTab from './components/CompareTab';
import MacroTab from './components/MacroTab';
import GroupTab from './components/GroupTab';

type TabKey = 'recommend' | 'compare' | 'macro' | 'group';

export default function App() {
  // 层次/选科控制数据集（recommend / compare / macro 共享）
  const [level, setLevel] = useState<'本科' | '专科'>('本科');
  const [subject, setSubject] = useState<Subject>('physics');

  // 跨 Tab 共享：对比院校列表（recommend 写入、compare 展示）
  const [comparedSchools, setComparedSchools] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('group');

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
            2025专业录取数据
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

          {activeTab === 'recommend' && (
            <RecommendTab
              level={level}
              setLevel={setLevel}
              subject={subject}
              setSubject={setSubject}
              currentDataset={currentDataset}
              comparedSchools={comparedSchools}
              onToggleCompare={handleToggleCompare}
            />
          )}

          {activeTab === 'compare' && (
            <CompareTab
              comparedSchools={comparedSchools}
              currentDataset={currentDataset}
              onToggleCompare={handleToggleCompare}
              onClearComparison={clearComparison}
            />
          )}

          {activeTab === 'macro' && (
            <MacroTab currentDataset={currentDataset} />
          )}

          {activeTab === 'group' && (
            <GroupTab />
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


      {/* PWA 更新提示 */}
      <PWAUpdatePrompt />
    </div>
  );
}
