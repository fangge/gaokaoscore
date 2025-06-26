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
    return [...categoryData].sort((a, b) => b.score - a.score);
  }, [categoryData]);

  // Calculate total number of students
  const totalStudents = useMemo(() => {
    return sortedData.length > 0 ? sortedData[sortedData.length - 1].cumulative : 0;
  }, [sortedData]);

  // Calculate user's ranking if userScore is provided
  const userRanking = useMemo(() => {
    if (!userScore || sortedData.length === 0) return null;
    
    // Find the closest score entry that is less than or equal to userScore
    for (let i = 0; i < sortedData.length; i++) {
      if (sortedData[i].score <= userScore) {
        return {
          score: userScore,
          rank: sortedData[i].cumulative,
          percentile: ((sortedData[i].cumulative / totalStudents) * 100).toFixed(2)
        };
      }
    }
    
    // If no match found, user is at the bottom
    return {
      score: userScore,
      rank: totalStudents,
      percentile: "100.00"
    };
  }, [userScore, sortedData, totalStudents]);

  // Prepare chart data
  const xAxisData = useMemo(() => sortedData.map(item => item.score), [sortedData]);
  const countData = useMemo(() => sortedData.map(item => item.count), [sortedData]);

  // Chart options
  const option: EChartsOption = {
    tooltip: {
      trigger: "axis" as const,
      axisPointer: {
        type: "shadow" as const
      },
      formatter: (params: any) => {
        const score = params[0].axisValue;
        const count = params[0].data;
        const item = sortedData.find(d => d.score === score);
        const cumulative = item ? item.cumulative : 0;
        const percentile = ((cumulative / totalStudents) * 100).toFixed(2);
        
        return `
          <div style="font-weight: bold; margin-bottom: 5px;">分数: ${score}</div>
          <div>该分数人数: ${count}人</div>
          <div>累计人数: ${cumulative}人</div>
          <div>超过全省考生: ${percentile}%</div>
        `;
      }
    },
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
      {userRanking && (
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
          <div>超过全省考生: {userRanking.percentile}%</div>
        </div>
      )}
    </div>
  );
}
