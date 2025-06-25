"use client";
import React, { useState, useMemo } from "react";
import gaokaoData from "../../data/gaokao_lines.json";
import dynamic from "next/dynamic";
import { Layout, Tabs, InputNumber, Select, Card, Typography, Result, Space, theme, Tag, Divider } from "antd";
import { CheckCircleTwoTone, TrophyTwoTone, BookTwoTone } from "@ant-design/icons";

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
): { category: string; difference: number }[] => {
  return allData
    .filter(d => d.type === type)
    .filter(d => {
      const line = d.lines["2024"];
      if (!line || line === "-") return false;
      const mainScore = parseInt(line.split("/")[0], 10);
      return !isNaN(mainScore) && score >= mainScore;
    })
    .map(d => {
      const line = d.lines["2024"];
      const mainScore = parseInt(line!.split("/")[0], 10);
      return {
        category: d.category,
        difference: score - mainScore
      };
    })
    .sort((a, b) => a.difference - b.difference);
};

export default function HomePage() {
  const [tab, setTab] = useState<"本科" | "专科">("本科");
  const [score, setScore] = useState<number | null>(null);
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
    if (typeof score !== "number" || isNaN(score)) return [];
    return matchCategory(score, tab);
  }, [score, tab]);

  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <div 
        style={{ 
          background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
          padding: "40px 0 50px",
          marginBottom: 24,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <Typography.Title 
          level={2} 
          style={{ 
            textAlign: "center", 
            color: "white",
            margin: 0,
            textShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}
        >
          广东高考2021-2024年录取最低分数线
        </Typography.Title>
        <Typography.Paragraph 
          style={{ 
            textAlign: "center", 
            color: "rgba(255,255,255,0.85)",
            marginTop: 8,
            fontSize: 16
          }}
        >
          输入分数，匹配科类，查看历年分数线走势
        </Typography.Paragraph>
      </div>
      <Layout.Content style={{ maxWidth: 1920, margin: "0 auto", padding: "0 24px 24px" }}>
        <Card 
          style={{ 
            marginBottom: 24,
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}
        >
          <Tabs
            activeKey={tab}
            onChange={k => setTab(k as "本科" | "专科")}
            items={[
              { key: "本科", label: "本科" },
              { key: "专科", label: "专科" }
            ]}
            tabBarGutter={32}
          />
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space wrap>
              <span style={{ fontWeight: 500 }}>输入高考分数：</span>
              <InputNumber
                min={0}
                max={750}
                value={score ?? undefined}
                onChange={v => setScore(typeof v === "number" ? v : null)}
                placeholder="如 520"
                style={{ width: 120 }}
                aria-label="高考分数输入"
              />
              <span style={{ fontWeight: 500, marginLeft: 24 }}>科类筛选：</span>
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: 200 }}
                options={categories.map(c => ({ value: c, label: c }))}
                aria-label="科类筛选"
              />
            </Space>
            <Card
              type="inner"
              title={
                <div style={{ display: "flex", alignItems: "center" }}>
                  <BookTwoTone twoToneColor={token.colorPrimary} />
                  <span style={{ marginLeft: 8 }}>分数线走势图</span>
                </div>
              }
              style={{ marginTop: 16, background: "#fafcff", borderRadius: 8 }}
              bodyStyle={{ padding: 0, height: 500 }}
            >
              <ScoreChart data={filteredData} years={years} />
            </Card>
          </Space>
        </Card>
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center" }}>
              <TrophyTwoTone twoToneColor="#faad14" />
              <span style={{ marginLeft: 8 }}>分数匹配结果</span>
            </div>
          }
          style={{ 
            marginBottom: 24, 
            background: "#f6ffed",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}
          headStyle={{ color: token.colorSuccess }}
        >
          {typeof score === "number" && !isNaN(score) ? (
            matched.length > 0 ? (
              <Result
                status="success"
                icon={<CheckCircleTwoTone twoToneColor={token.colorSuccess} />}
                title="可报考科类"
                subTitle={
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text strong>您的分数：{score}分</Typography.Text>
                    <Divider style={{ margin: "12px 0" }} />
                    <ul style={{ textAlign: "left", padding: 0, listStyle: "none" }}>
                      {matched.map(m => (
                        <li key={m.category} style={{ margin: "8px 0", fontSize: 16 }}>
                          <Space>
                            <span>{m.category}</span>
                            <Tag color="success">高出{m.difference}分</Tag>
                          </Space>
                        </li>
                      ))}
                    </ul>
                  </div>
                }
              />
            ) : (
              <Result status="warning" title="未匹配到对应科类" />
            )
          ) : (
            <Result status="info" title="请输入分数以查看匹配科类" />
          )}
        </Card>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center" }}>
          数据来源：广东省教育考试院，仅供参考
        </Typography.Paragraph>
      </Layout.Content>
    </Layout>
  );
}
