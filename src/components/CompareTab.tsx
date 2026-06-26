import { useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import type { UniversityData } from '../types';

interface CompareTabProps {
  comparedSchools: string[];
  currentDataset: UniversityData[];
  onToggleCompare: (name: string) => void;
  onClearComparison: () => void;
}

const COMPARE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

/**
 * 多校对比分析 Tab
 * - 支持最多 5 所院校同屏比对往年投档分数与录取最低位次
 */
export default function CompareTab({ comparedSchools, currentDataset, onToggleCompare, onClearComparison }: CompareTabProps) {
  // Comparison data compilation for charts
  const comparisonChartData = useMemo(() => {
    if (comparedSchools.length === 0) return [];

    const years = [2023, 2024, 2025] as const;

    return years.map(yr => {
      const row: Record<string, string | number | undefined> = { year: `${yr}年` };
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

  return (
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
            onClick={onClearComparison}
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
                    onClick={() => onToggleCompare(name)}
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
                    {comparedSchools.map((name, idx) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={`${name}_score`}
                        name={name}
                        stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    ))}
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
                    {comparedSchools.map((name, idx) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={`${name}_rank`}
                        name={name}
                        stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    ))}
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
  );
}
