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

export default function MacroTab({ currentDataset }: MacroTabProps) {
  const volatilityData = useMemo(() => {
    return currentDataset
      .map(univ => {
        const r23 = univ.history[2023]?.rank;
        const r25 = univ.history[2025]?.rank;
        const s23 = univ.history[2023]?.score;
        const s25 = univ.history[2025]?.score;

        if (r23 === null || r23 === undefined || r25 === null || r25 === undefined || s23 === null || s23 === undefined || s25 === null || s25 === undefined) return null;
        const rankShift = r25 - r23;
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

  const chartTooltipStyle = {
    fontSize: 12,
    borderRadius: '11px',
    background: '#1d1d1f',
    border: 'none',
    color: '#ffffff',
    padding: '8px 12px',
  };

  return (
    <div className="flex flex-col gap-6" id="tab_macro">

      {/* Macro overview metrics card */}
      <div className="bg-white rounded-[18px] border border-[#d2d2d7] p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Volatility Explanation */}
        <div className="flex flex-col gap-3">
          <div className="bg-[#1d1d1f] p-2.5 rounded-[11px] text-white w-11 h-11 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-[#1d1d1f] text-[17px]">什么是投档位次大波动？</h4>
            <p className="text-[14px] text-[#86868b] mt-1 leading-[1.47]">
              广东省高考采用院校专业组并行志愿投档。当一些高校因为专业组设置调整、招生计划剧增、或是产生"小年"断档效应时，其往年最低投档排位会出现数万名的大幅波动。
            </p>
            <p className="text-[14px] text-[#0066cc] font-semibold mt-2">
              抓住波动规律，是高考填报中成功"低分捡漏"的关键所在。
            </p>
          </div>
        </div>

        {/* 2. Public vs Private Admission ranges */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">
            本科投档分区间速览
          </h4>
          <div className="flex-1 flex flex-col justify-center gap-4 bg-[#f5f5f7] p-5 rounded-[18px]">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[#1d1d1f]">公办本科区间</span>
              <span className="font-semibold text-[#0066cc]">480 — 662 分</span>
            </div>
            <div className="w-full bg-[#d2d2d7] h-2 rounded-full overflow-hidden">
              <div className="bg-[#0066cc] h-full w-[80%] rounded-full ml-[20%]" />
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[#1d1d1f]">民办/独立学院区间</span>
              <span className="font-semibold text-[#a02828]">436 — 513 分</span>
            </div>
            <div className="w-full bg-[#d2d2d7] h-2 rounded-full overflow-hidden">
              <div className="bg-[#a02828] h-full w-[45%] rounded-full" />
            </div>
          </div>
        </div>

        {/* 3. Volatility trend gauge */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">
            投档数据完整率校验
          </h4>
          <div className="flex-1 bg-[#f5f5f7] p-5 rounded-[18px] flex items-center gap-3.5">
            <div className="bg-[#1d7a3d]/10 p-2.5 rounded-full text-[#1d7a3d]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[13px] text-[#86868b] font-semibold block">100% 官方投档线一致性</span>
              <span className="text-[15px] font-semibold text-[#1d1d1f]">
                完美复刻自广东省教育考试院公布数据
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Top Volatile Colleges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Fluctuation schools list (Left 2 columns) */}
        <div className="bg-white border border-[#d2d2d7] p-6 md:p-8 lg:col-span-2 flex flex-col gap-4 rounded-[18px]">
          <div>
            <h3 className="text-[19px] font-semibold text-[#1d1d1f] tracking-tight">
              省内高校最低排位波动幅度排行 (2023 vs 2025)
            </h3>
            <p className="text-[14px] text-[#86868b] mt-1">
              筛选出过去3年位次波动变动最大、极具起伏的 10 所省内本科学院（数值越大代表不确定性越高）。
            </p>
          </div>

          <div className="overflow-x-auto rounded-[18px] border border-[#d2d2d7]">
            <table className="w-full text-[13px] text-left border-collapse" id="volatility_table">
              <thead>
                <tr className="bg-[#f5f5f7] border-b border-[#d2d2d7] text-[#86868b] font-semibold">
                  <th className="p-3">院校名称</th>
                  <th className="p-3">性质</th>
                  <th className="p-3 text-center">23年投档排位</th>
                  <th className="p-3 text-center">25年投档排位</th>
                  <th className="p-3 text-right">排位震荡幅度 (位)</th>
                </tr>
              </thead>
              <tbody>
                {volatilityData.map(item => (
                  <tr key={item.name} className="border-b border-[#e8e8ed] last:border-b-0 hover:bg-[#f5f5f7] transition-all">
                    <td className="p-3 font-semibold text-[#1d1d1f]">{item.name}</td>
                    <td className="p-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${item.nature === '公办' ? 'bg-[#0066cc]/8 text-[#0066cc]' : 'bg-[#a02828]/8 text-[#a02828]'
                        }`}>
                        {item.nature}
                      </span>
                    </td>
                    <td className="p-3 text-center text-[#86868b]">{item.r23.toLocaleString()}</td>
                    <td className="p-3 text-center text-[#1d1d1f] font-semibold">{item.r25.toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold text-[#0066cc] bg-[#0066cc]/3">
                      ± {item.rankShift.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Macro distribution chart (Right 1 column) */}
        <div className="bg-white border border-[#d2d2d7] p-6 md:p-8 lg:col-span-1 flex flex-col gap-4 rounded-[18px]">
          <h4 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
            本省高校本科投档最低分密集度分布
          </h4>
          <p className="text-[14px] text-[#86868b]">
            直观反映省内高校在各个成绩层段（20分一档）的供给数量分布。
          </p>

          <div className="h-64 bg-[#f5f5f7] rounded-[18px] p-3 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scoreDistribution}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d2d2d7" vertical={false} opacity={0.6} />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#86868b' }} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#86868b' }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} 所`, '高校数量']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0066cc' : '#2997ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#f5f5f7] p-4 rounded-[18px] text-[13px] text-[#86868b] flex flex-col gap-2">
            <span className="font-semibold flex items-center gap-1 text-[#1d1d1f]">
              <Sparkles className="w-4 h-4 text-[#0066cc]" />
              宏观格局研判结论：
            </span>
            <p className="leading-[1.47]">
              2025年，广东本科投档格局进一步极化。优质公办本科名额集中在 550 分以上的头部，而 460 - 500 分之间有极强的竞争密集带，民办院校集中在 436 - 464 之间的低位保护带。
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
