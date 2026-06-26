/// <reference lib="webworker" />
// 专业录取数据筛选 Web Worker：离线计算，避免阻塞主线程渲染与交互
import type { MajorGroupData } from './types';

// 筛选请求参数
export interface GroupFilterParams {
  data: MajorGroupData[];
  level: string;          // 本科 / 专科
  search: string;         // 搜索关键词
  sortBy: 'rankAsc' | 'rankDesc' | 'scoreDesc' | 'scoreAsc' | 'name';
  scoreInput: string;     // 投档分数输入
  rankInput: string;      // 全省排位输入
  defaultLimit: number;   // 无筛选时的默认展示条数
}

self.onmessage = (e: MessageEvent<GroupFilterParams>) => {
  const { data, level, search, sortBy, scoreInput, rankInput, defaultLimit } = e.data;
  const q = search.trim().toLowerCase();
  const eligScore = parseInt(scoreInput);
  const eligRank = parseInt(rankInput);
  const hasEligScore = !isNaN(eligScore);
  const hasEligRank = !isNaN(eligRank);
  // 是否存在主动筛选条件：搜索词、或填写了排位/分数
  const hasActiveFilter = q !== '' || hasEligScore || hasEligRank;

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
      const byScore = hasEligScore ? g.minScore <= eligScore : false;
      const byRank = hasEligRank ? g.minRank >= eligRank : false;
      return byScore || byRank;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.school.localeCompare(b.school, 'zh');
      if (sortBy === 'rankAsc') return a.minRank - b.minRank;
      if (sortBy === 'rankDesc') return b.minRank - a.minRank;
      if (sortBy === 'scoreDesc') return b.minScore - a.minScore;
      if (sortBy === 'scoreAsc') return a.minScore - b.minScore;
      return 0;
    })
    .slice(0, hasActiveFilter ? undefined : defaultLimit);

  // 传输结果：使用 Transferable 不可行（对象含字符串），直接 postMessage
  (self as any).postMessage(result);
};
