"use client";
import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { EChartsOption } from "echarts";

interface ScoreDistributionChartProps {
  categoryData: {
    score: number;
    count: number;
    cumulative: number;
  }[];
  userScore?: number;
}

export default function ScoreDistributionChart({ categoryData, userScore }: ScoreDistributionChartProps) {
  // Sort data by score in descending order
  const sortedData = useMemo(() => {
    return categoryData && categoryData.length > 0 
      ? [...categoryData].sort((a, b) => b.score - a.score) 
      : [];
  }, [categoryData]);

  // Calculate total number of students
  const totalStudents = useMemo(() => {
    return sortedData.length > 0 ? sortedData[sortedData.length - 1].cumulative : 0;
  }, [sortedData]);

  // Show empty state if no data
  const isEmpty = sortedData.length === 0;

  // Calculate user's ranking if userScore is provided
  const userRanking = useMemo(() => {
    if (typeof userScore !== "number" || sortedData.length === 0) return null;
    // 找到第一个分数小于等于userScore的分段
    for (let i = 0; i < sortedData.length; i++) {
      if (sortedData[i].score <= userScore) {
        // 高于该分数的人数 = sortedData[i].cumulative - sortedData[i].count
        const aboveCount = sortedData[i].cumulative - sortedData[i].count;
        return {
          score: userScore,
          rank: sortedData[i].cumulative,
          percentile: ((aboveCount / totalStudents) * 100).toFixed(2)
        };
      }
    }
    // 没有匹配分数，视为最低分，排名为总人数，百分比为0
    return {
      score: userScore,
      rank: totalStudents,
      percentile: "0.00"
    };
  }, [userScore, sortedData, totalStudents]);

  // Prepare chart data
  const xAxisData = useMemo(() => sortedData.map(item => item.score), [sortedData]);
  const countData = useMemo(() => sortedData.map(item => item.count), [sortedData]);

  // Chart options
  const option: EChartsOption = {
    tooltip: {
      trigger: isEmpty ? undefined : "axis" as const,
      axisPointer: {
        type: "shadow" as const
      },
      formatter: (params: any) => {
        const score = params[0].axisValue;
        const count = params[0].data;
        const item = sortedData.find(d => d.score === score);
        const cumulative = item ? item.cumulative : 0;
        const aboveCount = cumulative - (item ? item.count : 0);
        const rawPercentile = (aboveCount / totalStudents) * 100;
        const percentile = (rawPercentile < 0.01 && rawPercentile > 0) ? "0.01" : rawPercentile.toFixed(2);
        return `
          <div style="font-weight: bold; margin-bottom: 5px;">分数: ${score}</div>
          <div>该分数人数: ${count}人</div>
          <div>累计人数: ${cumulative}人</div>
        `;
      }
    },
    graphic: isEmpty ? {
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: '暂无该科目的分数分布数据',
        fontSize: 16,
        fontWeight: 'normal',
        fill: '#666'
      }
    } : undefined,
    grid: {
      left: 50,
      right: 30,
      top: 60,
      bottom: 60
    },
    xAxis: {
      type: "category" as const,
      data: xAxisData,
      name: "分数",
      nameLocation: "middle" as const,
      nameGap: 30,
      nameTextStyle: {
        fontWeight: "bold" as const,
        fontSize: 16
      },
      axisLabel: {
        fontWeight: "bold" as const,
        fontSize: 12,
        interval: Math.ceil(xAxisData.length / 20) // Show fewer labels for readability
      }
    },
    yAxis: {
      type: "value" as const,
      name: "人数",
      nameLocation: "middle" as const,
      nameGap: 40,
      nameTextStyle: {
        fontWeight: "bold" as const,
        fontSize: 16
      },
      axisLabel: {
        fontWeight: "bold" as const,
        fontSize: 14
      },
      splitLine: {
        lineStyle: {
          type: "dashed" as const
        }
      }
    },
    series: [
      {
        name: "分数分布",
        type: "bar" as const,
        data: countData,
        itemStyle: {
          color: "#4096ff"
        },
        markLine: userScore
          ? {
              data: [
                {
                  name: "您的分数",
                  xAxis: userScore,
                  lineStyle: {
                    color: "#ff4d4f",
                    width: 2,
                    type: "solid" as const
                  },
                  label: {
                    formatter: `您的分数: ${userScore}`,
                    position: "insideEndTop" as const,
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#ff4d4f"
                  }
                }
              ]
            }
          : undefined
      }
    ]
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactECharts
        option={option}
        style={{ width: "100%", height: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={true}
        lazyUpdate={false}
      />
      {/* 排名卡片仅在用户点击匹配后（如传入showRankingCard=true）才显示，默认始终显示图表 */}
      {typeof userScore === "number" && userRanking && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(255, 255, 255, 0.9)",
            padding: "10px 15px",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            border: "1px solid #f0f0f0"
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 5, color: "#ff4d4f" }}>
            您的排名情况
          </div>
          <div>分数: {userRanking.score}</div>
          <div>排名: {userRanking.rank}</div>
          <div>高于全省考生: {userRanking.percentile}%</div>
        </div>
      )}
    </div>
  );
}