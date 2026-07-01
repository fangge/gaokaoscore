import { useState, useMemo } from 'react';
import { SlidersHorizontal, X, Search, Plus, Minus } from 'lucide-react';
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

const COMPARE_COLORS = ['#0066cc', '#1d7a3d', '#a02828', '#6b4fbb', '#b86b00'];

export default function CompareTab({ comparedSchools, currentDataset, onToggleCompare, onClearComparison }: CompareTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const comparisonChartData = useMemo(() => {
    if (comparedSchools.length === 0) return [];

    const years = [2023, 2024, 2025] as const;

    return years.map(yr => {
      const row: Record<string, string | number | undefined> = { year: `${yr}年` };
      comparedSchools.forEach(name => {
        const univ = currentDataset.find(u => u.name === name);
        if (univ) {
          const score = univ.history[yr]?.score;
          const rank = univ.history[yr]?.rank;
          row[`${name}_score`] = score ?? undefined;
          row[`${name}_rank`] = rank ?? undefined;
        }
      });
      return row;
    });
  }, [comparedSchools, currentDataset]);

  // 搜索结果：未加入对比的院校
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return currentDataset
      .filter(u => u.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, currentDataset]);

  const chartTooltipStyle = {
    fontSize: 12,
    borderRadius: '11px',
    background: '#1d1d1f',
    border: 'none',
    color: '#ffffff',
    padding: '8px 12px',
  };

  return (
    <div className="bg-white rounded-[18px] border border-[#d2d2d7] p-6 md:p-8 flex flex-col gap-6" id="tab_compare">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">
            多校并列对比分析
          </h3>
          <p className="text-[14px] text-[#86868b] mt-1">
            支持最多 5 所院校同屏比对往年投档分数、录取最低位次的纵向跌宕态势。
          </p>
        </div>

        {comparedSchools.length > 0 && (
          <button
            onClick={onClearComparison}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#a02828] hover:bg-[#a02828]/5 border border-[#a02828]/15 transition-all cursor-pointer apple-press"
          >
            清空对比列表
          </button>
        )}
      </div>

      {/* School Search & Add */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#86868b] shrink-0">搜索:</span>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#86868b] absolute left-4 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入院校名称搜索并加入对比"
              className="w-full bg-[#f5f5f7] border border-transparent focus:border-[#0066cc] rounded-full py-1.5 pl-10 pr-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 text-[#1d1d1f] placeholder:text-[#86868b] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {searchResults.map((univ) => {
              const isCompared = comparedSchools.includes(univ.name);
              return (
                <div
                  key={univ.name}
                  className="flex items-center justify-between bg-[#f5f5f7] rounded-[11px] px-4 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14px] font-semibold text-[#1d1d1f] truncate">{univ.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${univ.nature === '公办' ? 'bg-[#0066cc]/8 text-[#0066cc]' : univ.nature === '民办' ? 'bg-[#a02828]/8 text-[#a02828]' : 'bg-[#1d1d1f]/8 text-[#1d1d1f]'}`}>
                      {univ.nature}
                    </span>
                    <span className="text-[12px] text-[#86868b] shrink-0">
                      2025年: {univ.history[2025]?.score ?? '—'}分 / {univ.history[2025]?.rank?.toLocaleString() ?? '—'}位
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleCompare(univ.name)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 transition-all cursor-pointer apple-press shrink-0 ${isCompared
                        ? 'bg-[#1d1d1f] text-white'
                        : 'bg-white text-[#1d1d1f] border border-[#d2d2d7]'
                      }`}
                  >
                    {isCompared ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {isCompared ? '移除' : '加入'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {searchQuery.trim() && searchResults.length === 0 && (
          <div className="text-[13px] text-[#86868b] py-2">未找到匹配的院校</div>
        )}
      </div>

      {comparedSchools.length === 0 ? (
        <div className="bg-[#f5f5f7] rounded-[18px] p-16 text-center flex flex-col items-center justify-center gap-4">
          <div className="bg-white p-3 rounded-[18px] border border-[#d2d2d7]">
            <SlidersHorizontal className="w-6 h-6 text-[#86868b]" />
          </div>
          <div>
            <h4 className="font-semibold text-[#1d1d1f] text-[19px]">对比工作台为空</h4>
            <p className="text-[14px] text-[#86868b] max-w-sm mt-1 leading-[1.47]">
              请在上方搜索框输入院校名称，将多所院校加入对比工作台。
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">

          {/* Selected universities list row */}
          <div className="flex flex-wrap gap-2">
            {comparedSchools.map((name, idx) => {
              const univ = currentDataset.find(u => u.name === name);
              return (
                <div
                  key={name}
                  className="bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] rounded-full px-3.5 py-2 text-[13px] font-semibold flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMPARE_COLORS[idx % COMPARE_COLORS.length] }} />
                  <span>{name}</span>
                  <span className="text-[11px] bg-white text-[#86868b] px-1.5 py-0.5 rounded-full font-medium border border-[#d2d2d7]">
                    {univ?.nature}
                  </span>
                  <button
                    onClick={() => onToggleCompare(name)}
                    className="text-[#86868b] hover:text-[#1d1d1f] cursor-pointer p-0.5"
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
            <div className="bg-[#f5f5f7] p-5 rounded-[18px]">
              <span className="text-[14px] font-semibold text-[#1d1d1f] block mb-3">
                历年投档线分数对比 (2023 - 2025)
              </span>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d2d2d7" opacity={0.6} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#86868b' }} />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#86868b' }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
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
            <div className="bg-[#f5f5f7] p-5 rounded-[18px]">
              <span className="text-[14px] font-semibold text-[#1d1d1f] block mb-3">
                历年录取最低位次对比 (Y轴逆序)
              </span>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d2d2d7" opacity={0.6} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#86868b' }} />
                    <YAxis reversed tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#86868b' }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
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
          <div className="overflow-x-auto rounded-[18px] border border-[#d2d2d7]">
            <table className="w-full text-[13px] text-left border-collapse" id="comparison_matrix_table">
              <thead>
                <tr className="bg-[#f5f5f7] text-[#1d1d1f] font-semibold border-b border-[#d2d2d7]">
                  <th className="p-3">院校名称</th>
                  <th className="p-3">办学性质</th>
                  <th className="p-3 text-center border-l border-[#e8e8ed]" colSpan={2}>2025年最低录退</th>
                  <th className="p-3 text-center border-l border-[#e8e8ed]" colSpan={2}>2024年最低录退</th>
                  <th className="p-3 text-center border-l border-[#e8e8ed]" colSpan={2}>2023年最低录退</th>
                </tr>
                <tr className="bg-white text-[#86868b] text-[11px] border-b border-[#d2d2d7]">
                  <th className="p-2" />
                  <th className="p-2" />
                  <th className="p-2 text-center border-l border-[#e8e8ed] font-semibold">投档分</th>
                  <th className="p-2 text-center font-semibold">最低排位</th>
                  <th className="p-2 text-center border-l border-[#e8e8ed] font-semibold">投档分</th>
                  <th className="p-2 text-center font-semibold">最低排位</th>
                  <th className="p-2 text-center border-l border-[#e8e8ed] font-semibold">投档分</th>
                  <th className="p-2 text-center font-semibold">最低排位</th>
                </tr>
              </thead>
              <tbody>
                {comparedSchools.map(name => {
                  const univ = currentDataset.find(u => u.name === name);
                  if (!univ) return null;
                  return (
                    <tr key={name} className="border-b border-[#e8e8ed] last:border-b-0 hover:bg-[#f5f5f7] transition-all">
                      <td className="p-3 font-semibold text-[#1d1d1f]">{name}</td>
                      <td className="p-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#0066cc]/8 text-[#0066cc]">
                          {univ.nature}
                        </span>
                      </td>

                      <td className="p-3 text-center border-l border-[#e8e8ed] font-semibold text-[#0066cc] bg-[#0066cc]/3">
                        {univ.history[2025]?.score ?? '—'}
                      </td>
                      <td className="p-3 text-center font-medium text-[#1d1d1f] bg-[#0066cc]/3">
                        {univ.history[2025]?.rank?.toLocaleString() ?? '—'}
                      </td>

                      <td className="p-3 text-center border-l border-[#e8e8ed] text-[#1d1d1f]">
                        {univ.history[2024]?.score ?? '—'}
                      </td>
                      <td className="p-3 text-center text-[#86868b]">
                        {univ.history[2024]?.rank?.toLocaleString() ?? '—'}
                      </td>

                      <td className="p-3 text-center border-l border-[#e8e8ed] text-[#1d1d1f]">
                        {univ.history[2023]?.score ?? '—'}
                      </td>
                      <td className="p-3 text-center text-[#86868b]">
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
