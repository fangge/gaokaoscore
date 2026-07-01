import { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  // Compass,
  // SlidersHorizontal,
  // TrendingUp,
  HelpCircle,
} from 'lucide-react';
// import {
//   historyData,
//   physicsData,
//   juniorHistoryData,
//   juniorPhysicsData,
//   sportsData,
//   artData,
//   musicData,
//   actingData,
//   danceData,
//   juniorSportsData,
//   juniorArtData,
//   juniorMusicData,
//   juniorActingData,
//   juniorDanceData
// } from './data';
// import type { Subject } from './types';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
// import RecommendTab from './components/RecommendTab';
// import CompareTab from './components/CompareTab';
import MacroTab from './components/MacroTab';
import GroupTab from './components/GroupTab';

type TabKey = 'recommend' | 'compare' | 'macro' | 'group';

export default function App() {
  // 层次/选科控制数据集（recommend / compare / macro 共享）
  // const [level, setLevel] = useState<'本科' | '专科'>('本科');
  // const [subject, setSubject] = useState<Subject>('physics');

  // 跨 Tab 共享：对比院校列表（recommend 写入、compare 展示）
  const [comparedSchools, setComparedSchools] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('group');

  // Toggle school comparison
  // const handleToggleCompare = (schoolName: string) => {
  //   if (comparedSchools.includes(schoolName)) {
  //     setComparedSchools(prev => prev.filter(n => n !== schoolName));
  //   } else {
  //     if (comparedSchools.length >= 5) {
  //       alert('最多支持对比 5 所院校，请先移除部分已选院校');
  //       return;
  //     }
  //     setComparedSchools(prev => [...prev, schoolName]);
  //   }
  // };

  // Clear all comparison choices
  // const clearComparison = () => setComparedSchools([]);

  // Get current dataset
  // const currentDataset = useMemo(() => {
  //   if (level === '本科') {
  //     switch (subject) {
  //       case 'history': return historyData;
  //       case 'physics': return physicsData;
  //       case 'sports': return sportsData;
  //       case 'art': return artData;
  //       case 'music': return musicData;
  //       case 'acting': return actingData;
  //       case 'dance': return danceData;
  //       default: return physicsData;
  //     }
  //   } else {
  //     switch (subject) {
  //       case 'history': return juniorHistoryData;
  //       case 'physics': return juniorPhysicsData;
  //       case 'sports': return juniorSportsData;
  //       case 'art': return juniorArtData;
  //       case 'music': return juniorMusicData;
  //       case 'acting': return juniorActingData;
  //       case 'dance': return juniorDanceData;
  //       default: return juniorPhysicsData;
  //     }
  //   }
  // }, [level, subject]);

  // const tabs: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  //   { key: 'group', label: '2025专业录取数据', icon: BookOpen },
  //   { key: 'recommend', label: '择校推荐与查询', icon: Compass },
  //   { key: 'compare', label: '多校对比分析', icon: SlidersHorizontal },
  //   { key: 'macro', label: '省内院校宏观波动趋势', icon: TrendingUp },
  // ];

  return (
    <div className="bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased min-h-screen" id="main_root">

      {/* Premium Header */}
      <div className="bg-white border-b border-[#d2d2d7]" id="header_container">
        <div className="max-w-[1024px] mx-auto px-6 py-12 md:py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-[#1f3a8a] p-2.5 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-[40px] md:text-[48px] font-semibold tracking-[-0.02em] leading-[1.08] text-[#1d1d1f]">
            广东高考择校分析系统
          </h1>
          <p className="text-[19px] md:text-[21px] text-[#86868b] mt-4 leading-relaxed font-normal max-w-2xl mx-auto">
            收录2025年省内公办、民办及合作办学段完整投档数据
          </p>
        </div>
      </div>

      <main className="max-w-[1024px] mx-auto px-6 py-8 flex flex-col gap-8" id="app_main">

        {/* Navigation Tabs — Apple frosted pill segment control */}
        {/* <nav className="apple-frosted rounded-full p-1.5 flex gap-1 border border-[#d2d2d7] sticky top-0 z-30" id="navigation_tabs">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 min-w-0 py-2.5 px-3 text-[13px] font-semibold rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer apple-press truncate ${activeTab === key
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate hidden sm:inline">{label}</span>
              {key === 'compare' && comparedSchools.length > 0 && (
                <span className="bg-[#0066cc] text-white text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-semibold shrink-0">
                  {comparedSchools.length}
                </span>
              )}
            </button>
          ))}
        </nav> */}

        {/* Active Tab Panel Render */}
        <div className="transition-all duration-300">

          {/* {activeTab === 'recommend' && (
            <RecommendTab
              level={level}
              setLevel={setLevel}
              subject={subject}
              setSubject={setSubject}
              currentDataset={currentDataset}
              comparedSchools={comparedSchools}
              onToggleCompare={handleToggleCompare}
            />
          )} */}

          {/* {activeTab === 'compare' && (
            <CompareTab
              comparedSchools={comparedSchools}
              currentDataset={currentDataset}
              onToggleCompare={handleToggleCompare}
              onClearComparison={clearComparison}
            />
          )} */}

          {/* {activeTab === 'macro' && (
            <MacroTab currentDataset={currentDataset} />
          )} */}

          {activeTab === 'group' && (
            <GroupTab />
          )}

        </div>

      </main>

      {/* 免责声明 Footer */}
      <footer className="bg-[#f5f5f7] border-t border-[#d2d2d7] mt-8">
        <div className="max-w-[1024px] mx-auto px-6 py-12">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-4 h-4 text-[#86868b]" />
            <h3 className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight">
              免责声明
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#d2d2d7] rounded-[18px] overflow-hidden">
            <div className="bg-white p-6 flex flex-col gap-2">
              <span className="text-[14px] font-semibold text-[#1d1d1f]">
                志愿填报是考生自己的事
              </span>
              <p className="text-[12px] text-[#86868b] leading-[1.47]">
                本工具提供的数据、分析和建议仅供决策参考，不构成专业志愿填报指导意见。
              </p>
            </div>

            <div className="bg-white p-6 flex flex-col gap-2">
              <span className="text-[14px] font-semibold text-[#1d1d1f]">
                数据已尽力但不敢保证
              </span>
              <p className="text-[12px] text-[#86868b] leading-[1.47]">
                数据库来自各省教育考试院官方投档线，经多轮联网交叉验证，但录取数据每年变化，最终以各省教育考试院官网和学校官方招生网公布的当年数据为准。
              </p>
            </div>

            <div className="bg-white p-6 flex flex-col gap-2">
              <span className="text-[14px] font-semibold text-[#1d1d1f]">
                开发者不承担任何责任
              </span>
              <p className="text-[12px] text-[#86868b] leading-[1.47]">
                使用本工具产生的任何志愿填报决策及其后果，由考生和家长自行承担。开发者不对因使用或依赖本工具信息而导致的任何损失负责。
              </p>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-[18px] p-6 flex items-start gap-3 border border-[#e8e8ed]">
            <HelpCircle className="w-4 h-4 text-[#86868b] shrink-0 mt-0.5" />
            <div>
              <span className="text-[14px] font-semibold text-[#1d1d1f] block mb-1">
                不要盲信任何工具
              </span>
              <p className="text-[12px] text-[#86868b] leading-[1.47]">
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
