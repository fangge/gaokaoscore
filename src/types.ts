export type Subject = 'history' | 'physics' | 'sports' | 'art' | 'music' | 'acting' | 'dance';
export type SchoolNature = '公办' | '民办' | '合作办学';

// 志愿填报梯队：冲（搏一搏）/ 稳（主力）/ 保（双保险）
export type AdmissionTier = '冲' | '稳' | '保';

export interface YearData {
  score: number | null;
  rank: number | null;
}

export interface UniversityData {
  name: string;
  nature: SchoolNature;
  history: {
    2023: YearData;
    2024: YearData;
    2025: YearData;
  };
}

// 2025 院校专业组录取数据（源自 imgdata/data.xlsx 专业组数据，每个专业单独一条记录）
export interface MajorGroupData {
  school: string;            // 院校名称
  majorName: string;         // 专业全称
  majorCode: string;         // 专业代码
  groupCode: string;         // 专业组代码
  schoolGroupCode: string;   // 院校专业组代码
  subject: string;           // 科类（历史/物理）
  batch: string;             // 批次
  level: string;             // 本科/专科
  admissionCount: number;    // 专业组录取人数
  minScore: number;          // 专业组录取最低分
  minRank: number;           // 专业组最低位次
  tier?: AdmissionTier | null; // 冲/稳/保 梯队（筛选时由 Worker 计算注入）
}
