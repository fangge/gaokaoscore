"use client";
import React, { useState, useMemo } from "react";
import gaokaoData from "../../data/gaokao_lines.json";
import dynamic from "next/dynamic";

type Year = "2021" | "2022" | "2023" | "2024";
type Line = { [year in Year]?: string };
type GaokaoItem = {
  type: "本科" | "专科";
  category: string;
  lines: Line;
};

const years: Year[] = ["2021", "2022", "2023", "2024"];
const allData: GaokaoItem[] = gaokaoData as GaokaoItem[];

const ScoreChart = dynamic(() => import("../components/ScoreChart"), { ssr: false });

const getCategories = (type: "本科" | "专科") =>
  Array.from(new Set(allData.filter(d => d.type === type).map(d => d.category)));

const matchCategory = (
  score: number,
  type: "本科" | "专科"
): string[] => {
  // 返回所有分数线<=score的科类
  return allData
    .filter(d => d.type === type)
    .filter(d => {
      const line = d.lines["2024"];
      if (!line || line === "-") return false;
      // 处理如"360/210"、"315/190"等情况
      const mainScore = parseInt(line.split("/")[0], 10);
      return !isNaN(mainScore) && score >= mainScore;
    })
    .map(d => d.category);
};

export default function HomePage() {
  const [tab, setTab] = useState<"本科" | "专科">("本科");
  const [score, setScore] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");

  const categories = useMemo(() => ["全部", ...getCategories(tab)], [tab]);
  const filteredData = useMemo(
    () =>
      allData.filter(
        d => d.type === tab && (selectedCategory === "全部" || d.category === selectedCategory)
      ),
    [tab, selectedCategory]
  );

  const matched = useMemo(() => {
    const s = parseInt(score, 10);
    if (isNaN(s)) return [];
    return matchCategory(s, tab);
  }, [score, tab]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-50 to-green-100 flex flex-col items-center py-8">
      <h1 className="text-2xl md:text-4xl font-bold mb-2 text-green-700">广东高考2021-2024年录取最低分数线</h1>
      <div className="flex gap-4 mb-4">
        {(["本科", "专科"] as const).map(t => (
          <button
            key={t}
            className={`px-4 py-2 rounded font-semibold border-2 focus:outline-none transition ${
              tab === t
                ? "bg-green-600 text-white border-green-700"
                : "bg-white text-green-700 border-green-300"
            }`}
            onClick={() => setTab(t)}
            tabIndex={0}
            aria-label={t}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <label className="flex items-center gap-2 font-medium text-green-800" htmlFor="score-input">
          输入高考分数:
          <input
            id="score-input"
            type="number"
            value={score}
            onChange={e => setScore(e.target.value.replace(/\D/, ""))}
            className="border rounded px-2 py-1 w-28 focus:ring-2 focus:ring-green-400"
            placeholder="如 520"
            tabIndex={0}
            aria-label="高考分数输入"
          />
        </label>
        <label className="flex items-center gap-2 font-medium text-green-800" htmlFor="category-select">
          科类筛选:
          <select
            id="category-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="border rounded px-2 py-1"
            tabIndex={0}
            aria-label="科类筛选"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="w-full max-w-3xl bg-white rounded shadow p-4 mb-6">
        <ScoreChart data={filteredData} years={years} />
      </div>
      <div className="w-full max-w-3xl bg-green-50 rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2 text-green-700">分数匹配结果</h2>
        {score && matched.length > 0 ? (
          <ul className="list-disc pl-6 text-green-800">
            {matched.map(c => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : score ? (
          <div className="text-red-500">未匹配到对应科类</div>
        ) : (
          <div className="text-gray-500">请输入分数以查看匹配科类</div>
        )}
      </div>
      <footer className="mt-8 text-gray-500 text-sm">数据来源：广东省教育考试院，仅供参考</footer>
    </main>
  );
}
