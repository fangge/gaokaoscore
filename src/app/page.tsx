"use client";
import React, { useState, useMemo, useEffect } from "react";
import gaokaoData from "../../data/gaokao_lines.json";
import scoreDistributions from "../../data/score_distributions.json";
import dynamic from "next/dynamic";
import { Layout, Tabs, InputNumber, Select, Card, Typography, Result, Space, theme, Tag, Divider } from "antd";
import { CheckCircleTwoTone, TrophyTwoTone, BookTwoTone, BarChartOutlined } from "@ant-design/icons";

type Year = "2021" | "2022" | "2023" | "2024" | "2025";
type Line = { [year in Year]?: string };
type GaokaoItem = {
  type: "本科" | "专科";
  category: string;
  lines: Line;
};

const years: Year[] = ["2021", "2022", "2023", "2024", "2025"];
const allData: GaokaoItem[] = gaokaoData as GaokaoItem[];

const ScoreChart = dynamic(() => import("../components/ScoreChart"), { ssr: false });
const ScoreDistributionChart = dynamic(() => import("../components/ScoreDistributionChart"), { ssr: false });

const getCategories = (type: "本科" | "专科") =>
  Array.from(new Set(allData.filter(d => d.type === type).map(d => d.category)));

const matchCategory = (
  score: number
): { type: "本科" | "专科"; category: string; difference: number }[] => {
  return allData
    .filter(d => {
      const line = d.lines["2025"];
      if (!line || line === "-") return false;
      const mainScore = parseInt(line.split("/")[0], 10);
      return !isNaN(mainScore) && score >= mainScore;
    })
    .map(d => {
      const line = d.lines["2025"];
      const mainScore = parseInt(line!.split("/")[0], 10);
      return {
        type: d.type,
        category: d.category,
        difference: score - mainScore
      };
    })
    .sort((a, b) => {
      // 先按类型排序（本科在前，专科在后）
      if (a.type !== b.type) {
        return a.type === "本科" ? -1 : 1;
      }
      // 再按分差排序（从小到大）
      return a.difference - b.difference;
    });
};

export default function HomePage() {
  const [tab, setTab] = useState<"本科" | "专科">("本科");
  const [score, setScore] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [matchedResults, setMatchedResults] = useState<{ type: "本科" | "专科"; category: string; difference: number }[]>([]);
  const [hasMatched, setHasMatched] = useState<boolean>(false);
  const [selectedDistributionCategory, setSelectedDistributionCategory] = useState<string | null>(null);
  const resultCardRef = React.useRef<HTMLDivElement>(null);

  const categories = useMemo(() => ["全部", ...getCategories(tab)], [tab]);
  const filteredData = useMemo(
    () =>
      allData.filter(
        d => d.type === tab && (selectedCategory === "全部" || d.category === selectedCategory)
      ),
    [tab, selectedCategory]
  );
  
  // Find the score distribution data for the selected category
  const distributionData = useMemo(() => {
    if (!selectedDistributionCategory) return null;
    
    const categoryData = scoreDistributions.find(d => d.category === selectedDistributionCategory);
    return categoryData ? categoryData.scoreData : null;
  }, [selectedDistributionCategory]);
  
  // Update selected distribution category when a match is found
  useEffect(() => {
    if (matchedResults.length > 0) {
      // Prioritize 普通类(历史) or 普通类(物理) if matched
      const priorityCategory = matchedResults.find(r => 
        r.category === "普通类(历史)" || r.category === "普通类(物理)"
      );
      
      if (priorityCategory) {
        setSelectedDistributionCategory(priorityCategory.category);
      } else {
        // Otherwise use the first match
        setSelectedDistributionCategory(matchedResults[0].category);
      }
    }
  }, [matchedResults]);

  const handleMatch = () => {
    if (typeof score !== "number" || isNaN(score)) {
      setMatchedResults([]);
      setHasMatched(true);
    } else {
      const results = matchCategory(score);
      setMatchedResults(results);
      setHasMatched(true);
    }
    
    // 滚动到结果区域
    setTimeout(() => {
      if (resultCardRef.current) {
        resultCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // 按类型分组匹配结果
  const groupedResults = useMemo(() => {
    const grouped = {
      "本科": matchedResults.filter(r => r.type === "本科"),
      "专科": matchedResults.filter(r => r.type === "专科")
    };
    return grouped;
  }, [matchedResults]);

  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <div 
        style={{ 
          background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
          padding: "40px 0 20px",
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
          广东高考2021-2025年录取最低分数线
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
        <Typography.Paragraph 
          style={{ 
            textAlign: "center", 
            color: "rgba(255,255,255,0.75)",
            marginTop: 4,
            fontSize: 14
          }}
        >
          <a 
            href="https://eea.gd.gov.cn/ptgk/content/post_4733327.html" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            2025年数据来源
          </a>
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
            <Space wrap align="center">
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
              <button 
                onClick={handleMatch}
                style={{
                  backgroundColor: token.colorPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 15px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  height: '32px'
                }}
                aria-label="匹配科类"
              >
                匹配科类
              </button>
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
            
            {distributionData && (
              <Card
                type="inner"
                title={
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <BarChartOutlined style={{ color: token.colorPrimary }} />
                    <span style={{ marginLeft: 8 }}>
                      {selectedDistributionCategory} 分数分布与排名
                    </span>
                  </div>
                }
                style={{ marginTop: 16, background: "#fafcff", borderRadius: 8 }}
                bodyStyle={{ padding: 0, height: 500 }}
                extra={
                  <Select
                    value={selectedDistributionCategory}
                    onChange={setSelectedDistributionCategory}
                    style={{ width: 180 }}
                    options={scoreDistributions.map(d => ({ value: d.category, label: d.category }))}
                    placeholder="选择科类查看分布"
                  />
                }
              >
                <ScoreDistributionChart 
                  categoryData={distributionData} 
                  userScore={score ?? undefined}
                />
              </Card>
            )}
          </Space>
        </Card>
        <Card
          ref={resultCardRef}
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
          {hasMatched ? (
            matchedResults.length > 0 ? (
              <Result
                status="success"
                icon={<CheckCircleTwoTone twoToneColor={token.colorSuccess} />}
                title="本科和专科可报考科类"
                subTitle={
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text strong style={{ fontSize: 16 }}>您的分数：{score}分</Typography.Text>
                    <Typography.Paragraph style={{ marginTop: 8, color: token.colorTextSecondary }}>
                      以下是您可以报考的本科和专科科类，无论您当前选择的是哪个标签页
                    </Typography.Paragraph>
                    <Divider style={{ margin: "12px 0" }} />
                    
                    {/* 本科匹配结果 */}
                    {groupedResults["本科"].length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <Typography.Title level={5} style={{ 
                          color: token.colorPrimary, 
                          marginBottom: 12,
                          backgroundColor: 'rgba(24, 144, 255, 0.1)',
                          padding: '8px 12px',
                          borderRadius: '4px'
                        }}>
                          本科可报考科类 ({groupedResults["本科"].length}个)
                        </Typography.Title>
                        <ul style={{ textAlign: "left", padding: 0, listStyle: "none" }}>
                          {groupedResults["本科"].map(m => (
                            <li key={`本科-${m.category}`} style={{ margin: "8px 0", fontSize: 16 }}>
                              <Space>
                                <span>{m.category}</span>
                                <Tag color="success">高出{m.difference}分</Tag>
                                {/* 排名信息 */}
                                {(() => {
                                  const dist = scoreDistributions.find(d => d.category === m.category);
                                  if (dist && typeof score === "number") {
                                    // 找到分数≤score的最大项
                                    const sorted = [...dist.scoreData].sort((a, b) => b.score - a.score);
                                    const total = sorted.length > 0 ? sorted[sorted.length - 1].cumulative : 0;
                                    let found = sorted.find(d => d.score <= score);
                                    if (!found && sorted.length > 0) found = sorted[sorted.length - 1];
                                    if (found) {
                                      const percentile = ((found.cumulative / total) * 100).toFixed(2);
                                      return (
                                        <Tag color="blue" style={{ fontWeight: 500 }}>
                                          排名: {found.cumulative} / {total}（超越{percentile}%考生）
                                        </Tag>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                              </Space>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* 专科匹配结果 */}
                    {groupedResults["专科"].length > 0 && (
                      <div>
                        <Typography.Title level={5} style={{ 
                          color: "#722ed1", 
                          marginBottom: 12,
                          backgroundColor: 'rgba(114, 46, 209, 0.1)',
                          padding: '8px 12px',
                          borderRadius: '4px'
                        }}>
                          专科可报考科类 ({groupedResults["专科"].length}个)
                        </Typography.Title>
                        <ul style={{ textAlign: "left", padding: 0, listStyle: "none" }}>
                          {groupedResults["专科"].map(m => (
                            <li key={`专科-${m.category}`} style={{ margin: "8px 0", fontSize: 16 }}>
                              <Space>
                                <span>{m.category}</span>
                                <Tag color="purple">高出{m.difference}分</Tag>
                                {/* 排名信息 */}
                                {(() => {
                                  const dist = scoreDistributions.find(d => d.category === m.category);
                                  if (dist && typeof score === "number") {
                                    const sorted = [...dist.scoreData].sort((a, b) => b.score - a.score);
                                    const total = sorted.length > 0 ? sorted[sorted.length - 1].cumulative : 0;
                                    let found = sorted.find(d => d.score <= score);
                                    if (!found && sorted.length > 0) found = sorted[sorted.length - 1];
                                    if (found) {
                                      const percentile = ((found.cumulative / total) * 100).toFixed(2);
                                      return (
                                        <Tag color="blue" style={{ fontWeight: 500 }}>
                                          排名: {found.cumulative} / {total}（超越{percentile}%考生）
                                        </Tag>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                              </Space>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
          数据来源：<a href="https://eea.gd.gov.cn/bmbk/kszs/" target="_blank" rel="noopener noreferrer">广东省教育考试院</a>，仅供参考
        </Typography.Paragraph>
      </Layout.Content>
    </Layout>
  );
}
