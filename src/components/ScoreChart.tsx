"use client";
import React from "react";
import ReactECharts from "echarts-for-react";

type Year = "2021" | "2022" | "2023" | "2024";
type Line = { [year in Year]?: string };
type GaokaoItem = {
  type: "本科" | "专科";
  category: string;
  lines: Line;
};

interface ScoreChartProps {
  data: GaokaoItem[];
  years: Year[];
}

function parseScore(val?: string): number | null {
  if (!val || val === "-") return null;
  const main = val.split("/")[0];
  const n = parseInt(main, 10);
  return isNaN(n) ? null : n;
}

export default function ScoreChart({ data, years }: ScoreChartProps) {
  const series = data.map(item => ({
    name: item.category,
    type: "line" as const,
    data: years.map(y => parseScore(item.lines[y])),
    connectNulls: true,
    smooth: true,
    symbol: "circle"
  }));

  const option = {
    tooltip: {
      trigger: "axis" as const
    },
    legend: {
      data: data.map(d => d.category),
      type: "scroll"
    },
    grid: {
      left: 40,
      right: 20,
      top: 40,
      bottom: 30
    },
    xAxis: {
      type: "category" as const,
      data: years,
      axisLabel: { fontWeight: "bold" as const }
    },
    yAxis: {
      type: "value" as const,
      min: "dataMin",
      max: "dataMax",
      axisLabel: { fontWeight: "bold" as const }
    },
    series
  };

  return (
    <div className="w-full h-80" tabIndex={0} aria-label="分数线折线图">
      <ReactECharts option={option} style={{ width: "100%", height: 320 }} />
    </div>
  );
}
