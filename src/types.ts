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
