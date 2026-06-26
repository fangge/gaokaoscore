import type { AdmissionTier } from './types';

/**
 * 根据院校往年录取最低位次与考生当前位次，划分"冲 / 稳 / 保"梯队。
 *
 * 位次数越小 = 成绩越好 = 越难考。
 * - 冲：院校录取位次比考生高 5%-15%（位次数更小），搏一搏捡漏机会。
 * - 稳：院校录取位次在考生位次 ±5% 范围内，主力录取区间。
 * - 保：院校录取位次比考生低 5% 及以上（位次数更大），确保录取。
 *
 * @param schoolMinRank 院校往年（基准年份）录取最低位次
 * @param userRank      考生当前全省位次
 */
export function classifyTier(
  schoolMinRank: number | null | undefined,
  userRank: number
): AdmissionTier | null {
  if (!userRank || userRank <= 0 || !schoolMinRank || schoolMinRank <= 0) return null;
  const ratio = schoolMinRank / userRank;
  if (ratio >= 0.85 && ratio < 0.95) return '冲';
  if (ratio >= 0.95 && ratio < 1.05) return '稳';
  if (ratio >= 1.05) return '保';
  return null; // ratio < 0.85：差距过大，不在合理冲的区间内
}

export interface TierMeta {
  label: AdmissionTier;
  desc: string;
  proportion: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  countClass: string;
}

export const tierMeta: Record<AdmissionTier, TierMeta> = {
  冲: {
    label: '冲',
    desc: '往年录取位次比你高 5%-15%，搏一搏往年热度低、今年有捡漏机会的目标校',
    proportion: '约 20%（2-4 个）',
    badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    dotClass: 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]',
    borderClass: 'border-l-rose-500',
    countClass: 'text-rose-300',
  },
  稳: {
    label: '稳',
    desc: '往年录取位次在你 ±5% 范围内，是大概率能被录取的主力区间',
    proportion: '约 50%',
    badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    dotClass: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]',
    borderClass: 'border-l-blue-500',
    countClass: 'text-blue-300',
  },
  保: {
    label: '保',
    desc: '往年录取位次比你低 15%-25%，必须是你绝对愿意就读的院校，作双保险',
    proportion: '约 30%+（至少 2-3 个）',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
    borderClass: 'border-l-emerald-500',
    countClass: 'text-emerald-300',
  },
};

export const tierOrder: AdmissionTier[] = ['冲', '稳', '保'];
