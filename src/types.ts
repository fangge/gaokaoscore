export type Subject = 'history' | 'physics' | 'sports' | 'art' | 'music' | 'acting' | 'dance';
export type SchoolNature = '公办' | '民办' | '合作办学';

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

// 2025 院校专业组录取数据（源自 imgdata/data.xlsx 专业组数据，按院校专业组代码去重）
export interface MajorGroupData {
  school: string;            // 院校名称
  majorNames: string;        // 专业名称（组内专业，以、分隔）
  groupCode: string;         // 专业组代码
  schoolGroupCode: string;   // 院校专业组代码
  subject: string;           // 科类（历史/物理）
  batch: string;             // 批次
  level: string;             // 本科/专科
  minScore: number;          // 专业组录取最低分
  minRank: number;           // 专业组最低位次
}
