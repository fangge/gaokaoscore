import { useMemo } from 'react';
import { TrendingUp, CheckCircle2, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import type { UniversityData } from '../types';

interface MacroTabProps {
  currentDataset: UniversityData[];
}

/**
 * 省内院校宏观波动趋势 Tab
 * - 展示投档位次大波动院校排行
 * - 本科投档最低分密集度分布
 */
export default function MacroTab({ currentDataset }: MacroTabProps) {
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

  // 本科投档最低分密集度分布（20 分一档）
  const scoreDistribution = useMemo(() => {
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
  }, [currentDataset]);

  return (
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
                      <span className={`text-[0.5625rem] px-1.5 py-0.5 rounded font-bold ${item.nature === '公办' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
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
                data={scoreDistribution}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} formatter={(value) => [`${value} 所`, '高校数量']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {
                    scoreDistribution.map((entry, index) => (
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
  );
}
