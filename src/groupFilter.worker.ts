/// <reference lib="webworker" />
// 专业组数据筛选 Web Worker：离线计算，避免阻塞主线程渲染与交互
import type { MajorGroupData } from './types';
import { classifyTier } from './tierUtils';

// 筛选请求参数
export interface GroupFilterParams {
  data: MajorGroupData[];
  level: string;          // 本科 / 专科
  search: string;         // 搜索关键词
  sortBy: 'rankAsc' | 'rankDesc' | 'scoreDesc' | 'scoreAsc' | 'name';
  scoreInput: string;     // 投档分数输入
  rankInput: string;      // 全省排位输入
  defaultLimit: number;   // 无筛选时的默认展示条数
  tierFilter: 'all' | '冲' | '稳' | '保';
}

// 由投档分估算全省排位（与主面板估算逻辑保持一致）
function estimateRankFromScore(data: MajorGroupData[], score: number): number {
  const points = data
    .map(g => ({ score: g.minScore, rank: g.minRank }))
    .filter(p => p.score > 0 && p.rank > 0)
    .sort((a, b) => b.score - a.score); // 高分在前 = 低排位在前
  if (points.length === 0) return 0;
  if (score >= points[0].score) {
    return Math.max(1, Math.round(points[0].rank - (score - points[0].score) * 50));
  }
  const last = points[points.length - 1];
  if (score <= last.score) {
    return Math.round(last.rank + (last.score - score) * 1200);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (score <= p1.score && score >= p2.score) {
      if (p1.score === p2.score) return p1.rank;
      const ratio = (p1.score - score) / (p1.score - p2.score);
      return Math.round(p1.rank + ratio * (p2.rank - p1.rank));
    }
  }
  return 0;
}

self.onmessage = (e: MessageEvent<GroupFilterParams>) => {
  const { data, level, search, sortBy, scoreInput, rankInput, defaultLimit, tierFilter } = e.data;
  const q = search.trim().toLowerCase();
  const eligScore = parseInt(scoreInput);
  const eligRank = parseInt(rankInput);
  const hasEligScore = !isNaN(eligScore);
  const hasEligRank = !isNaN(eligRank);
  // 是否存在主动筛选条件：搜索词、或填写了排位/分数
  const hasActiveFilter = q !== '' || hasEligScore || hasEligRank;

  // 计算用于"冲稳保"梯队划分的等效排位
  let effectiveUserRank = 0;
  if (hasEligRank) {
    effectiveUserRank = eligRank;
  } else if (hasEligScore) {
    effectiveUserRank = estimateRankFromScore(data, eligScore);
  }
  const hasTier = effectiveUserRank > 0;
  const useTierFilter = tierFilter !== 'all';

  // 预构建小写搜索字段以加速 includes（避免每行重复 toLowerCase）
  const result = data
    .filter(g => g.level === level)
    .filter(g => {
      if (!q) return true;
      return (
        g.school.toLowerCase().includes(q) ||
        g.schoolGroupCode.includes(q) ||
        g.groupCode.includes(q) ||
        g.majorName.toLowerCase().includes(q)
      );
    })
    .filter(g => {
      if (!hasEligScore && !hasEligRank) return true;
      // 扩展至"冲"区间：纳入往年录取位次比当前高 5%-15% 的专业组
      const byScore = hasEligScore ? g.minScore <= eligScore : false;
      const byRank = hasTier ? g.minRank >= effectiveUserRank * 0.85 : false;
      return byScore || byRank;
    })
    .map(g => ({ ...g, tier: hasTier ? classifyTier(g.minRank, effectiveUserRank) : null }))
    .filter(g => {
      // 无排位/分数输入时无法划分梯队，忽略梯队筛选
      if (!useTierFilter || !hasTier) return true;
      return g.tier === tierFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.school.localeCompare(b.school, 'zh');
      if (sortBy === 'rankAsc') return a.minRank - b.minRank;
      if (sortBy === 'rankDesc') return b.minRank - a.minRank;
      if (sortBy === 'scoreDesc') return b.minScore - a.minScore;
      if (sortBy === 'scoreAsc') return a.minScore - b.minScore;
      return 0;
    })
    .slice(0, hasActiveFilter || useTierFilter ? undefined : defaultLimit);

  // 传输结果：使用 Transferable 不可行（对象含字符串），直接 postMessage
  (self as any).postMessage(result);
};
