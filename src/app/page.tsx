'use client';
import React, { useState, useMemo, useEffect } from 'react';
import gaokaoData from '../../data/gaokao_lines.json';
import scoreDistributions from '../../data/score_distributions.json';
import dynamic from 'next/dynamic';
import {
  Layout,
  Tabs,
  InputNumber,
  Select,
  Card,
  Typography,
  Result,
  Space,
  theme,
  Tag,
  Divider
} from 'antd';
import {
  CheckCircleTwoTone,
  TrophyTwoTone,
  BookTwoTone,
  BarChartOutlined
} from '@ant-design/icons';

type Year = '2021' | '2022' | '2023' | '2024' | '2025';
type Line = { [year in Year]?: string };
type GaokaoItem = {
  type: '本科' | '专科';
  category: string;
  lines: Line;
};
type DistributionsItem = {
  type: '本科' | '专科';
  category: string;
  scoreData: { score: number; count: number; cumulative: number }[];
};

const years: Year[] = ['2021', '2022', '2023', '2024', '2025'];
const allData: GaokaoItem[] = gaokaoData as GaokaoItem[];
  const distrubutionsData: DistributionsItem[] =
    scoreDistributions as DistributionsItem[];

const ScoreChart = dynamic(() => import('../components/ScoreChart'), {
  ssr: false
});
const ScoreDistributionChart = dynamic(
  () => import('../components/ScoreDistributionChart'),
  { ssr: false }
);

/**
 * 根据院校类型获取对应的专业类别列表
 * @param type 院校类型，可选值为'本科'或'专科'
 * @returns 去重后的专业类别数组
 */
const getCategories = (type: '本科' | '专科') =>
  Array.from(
    new Set(allData.filter((d) => d.type === type).map((d) => d.category))
  );

/**
 * 根据分数匹配符合条件的院校类别
 *
 * @param score - 考生分数
 * @returns 返回匹配的院校类别数组，包含类型(本科/专科)、类别名称及分差
 *          结果按类型(本科优先)和分差(从小到大)排序
 */
const matchCategory = (
  score: number
): { type: '本科' | '专科'; category: string; difference: number }[] => {
  return allData
    .filter((d) => {
      const line = d.lines['2025'];
      if (!line || line === '-') return false;
      const mainScore = parseInt(line.split('/')[0], 10);
      return !isNaN(mainScore) && score >= mainScore;
    })
    .map((d) => {
      const line = d.lines['2025'];
      const mainScore = parseInt(line!.split('/')[0], 10);
      return {
        type: d.type,
        category: d.category,
        difference: score - mainScore
      };
    })
    .sort((a, b) => {
      // 先按类型排序（本科在前，专科在后）
      if (a.type !== b.type) {
        return a.type === '本科' ? -1 : 1;
      }
      // 再按分差排序（从小到大）
      return a.difference - b.difference;
    });
};

/**
 * 广东高考分数线查询页面主组件
 *
 * 提供以下功能：
 * 1. 本科/专科分数线切换
 * 2. 分数输入与科类匹配
 * 3. 历年分数线走势图展示
 * 4. 分数分布图展示
 * 5. 匹配结果展示（包含排名信息）
 *
 * 数据来源：广东省教育考试院
 *
 * @returns 包含完整高考分数线查询功能的React组件
 */
export default function HomePage() {
  const [tab, setTab] = useState<'本科' | '专科'>('本科');
  const [score, setScore] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [matchedResults, setMatchedResults] = useState<
    { type: '本科' | '专科'; category: string; difference: number }[]
  >([]);
  const [hasMatched, setHasMatched] = useState<boolean>(false);
  const [selectedDistributionCategory, setSelectedDistributionCategory] =
    useState<string | null>(null);
  const resultCardRef = React.useRef<HTMLDivElement>(null);

  // 当前tab下所有分布数据
  const filteredDistributions = useMemo(
    () => distrubutionsData.filter((d) => d.type === tab),
    [tab, distrubutionsData]
  );

  const categories = useMemo(() => ['全部', ...getCategories(tab)], [tab]);
  const filteredData = useMemo(
    () =>
      allData.filter(
        (d) =>
          d.type === tab &&
          (selectedCategory === '全部' || d.category === selectedCategory)
      ),
    [tab, selectedCategory]
  );

  // 当前tab下，选中科类的分布数据
  const distributionData = useMemo(() => {
    if (!selectedDistributionCategory) return null;
    const categoryData = distrubutionsData.find(
      (d) =>
        d.category === selectedDistributionCategory &&
        d.type === tab
    );
    return categoryData ? categoryData.scoreData : null;
  }, [selectedDistributionCategory, tab, distrubutionsData]);

  useEffect(() => {
    if (matchedResults.length > 0) {
      // 优先选当前tab下的普通类(历史)或普通类(物理)
      const priorityCategory = matchedResults.find(
        (r) =>
          (r.category === '普通类(历史)' || r.category === '普通类(物理)') &&
          r.type === tab
      );
      // 只选当前tab下的第一个匹配
      const firstTabMatch = matchedResults.find((r) => r.type === tab);

      if (priorityCategory) {
        setSelectedDistributionCategory(priorityCategory.category);
      } else if (firstTabMatch) {
        setSelectedDistributionCategory(firstTabMatch.category);
      } else {
        // fallback: 选第一个匹配
        setSelectedDistributionCategory(matchedResults[0].category);
      }
    }
  }, [matchedResults, tab]);

  const handleMatch = () => {
    if (typeof score !== 'number' || isNaN(score)) {
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
        resultCardRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };

  // 按类型分组匹配结果
  const groupedResults = useMemo(() => {
    const grouped = {
      本科: matchedResults.filter((r) => r.type === '本科'),
      专科: matchedResults.filter((r) => r.type === '专科')
    };
    return grouped;
  }, [matchedResults]);

  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
          padding: '40px 0 20px',
          marginBottom: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <Typography.Title
          level={2}
          style={{
            textAlign: 'center',
            color: 'white',
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          广东高考2021-2025年录取最低分数线/2025年广东高考分数段统计
        </Typography.Title>
        <Typography.Paragraph
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.85)',
            marginTop: 8,
            fontSize: 16
          }}
        >
          输入分数，匹配科类，查看历年分数线走势
        </Typography.Paragraph>
        <Typography.Paragraph
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.75)',
            marginTop: 4,
            fontSize: 14
          }}
        >
          <a
            href="https://eea.gd.gov.cn/ptgk/content/post_4733327.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            2025年数据来源
          </a>
        </Typography.Paragraph>
      </div>
      <Layout.Content
        style={{ maxWidth: 1920, margin: '0 auto', padding: '0 24px 24px' }}
      >
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <Tabs
            activeKey={tab}
            onChange={(k) => setTab(k as '本科' | '专科')}
            items={[
              { key: '本科', label: '本科' },
              { key: '专科', label: '专科' }
            ]}
            tabBarGutter={32}
          />
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space wrap align="center">
              <span style={{ fontWeight: 500 }}>输入高考分数：</span>
              <InputNumber
                min={0}
                max={750}
                value={score ?? undefined}
                onChange={(v) => setScore(typeof v === 'number' ? v : null)}
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
              <span style={{ fontWeight: 500, marginLeft: 24 }}>
                科类筛选：
              </span>
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: 200 }}
                options={categories.map((c) => ({ value: c, label: c }))}
                aria-label="科类筛选"
              />
            </Space>
            <Card
              type="inner"
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BookTwoTone twoToneColor={token.colorPrimary} />
                  <span style={{ marginLeft: 8 }}>分数线走势图</span>
                </div>
              }
              style={{ marginTop: 16, background: '#fafcff', borderRadius: 8 }}
              bodyStyle={{ padding: 0, height: 500 }}
            >
              <ScoreChart data={filteredData} years={years} />
            </Card>

            <Card
              type="inner"
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BarChartOutlined style={{ color: token.colorPrimary }} />
                  <span style={{ marginLeft: 8 }}>
                    {selectedDistributionCategory || '选择科类'} 分数分布
                  </span>
                </div>
              }
              style={{
                marginTop: 16,
                background: '#fafcff',
                borderRadius: 8
              }}
              styles={{
                body: { padding: 0, height: 500 }
              }}
              extra={
                <Select
                  value={selectedDistributionCategory}
                  onChange={setSelectedDistributionCategory}
                  style={{ width: 180 }}
                  options={filteredDistributions.map((d, index) => ({
                    value: d.category,
                    label: `${index + 1}. ${d.category}`
                  }))}
                  placeholder="选择科类查看分布"
                />
              }
            >
              <ScoreDistributionChart
                categoryData={distributionData || []}
                userScore={hasMatched && score !== null ? score : undefined}
              />
            </Card>
          </Space>
        </Card>
        <Card
          ref={resultCardRef}
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TrophyTwoTone twoToneColor="#faad14" />
              <span style={{ marginLeft: 8 }}>分数匹配结果</span>
            </div>
          }
          style={{
            marginBottom: 24,
            background: '#f6ffed',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
          styles={{ header: { color: token.colorSuccess } }}
        >
          {hasMatched ? (
            matchedResults.length > 0 ? (
              <Result
                status="success"
                icon={<CheckCircleTwoTone twoToneColor={token.colorSuccess} />}
                title={`${tab}可报考科类`}
                subTitle={
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text strong style={{ fontSize: 16 }}>
                      您的分数：{score}分
                    </Typography.Text>
                    <Typography.Paragraph
                      style={{ marginTop: 8, color: token.colorTextSecondary }}
                    >
                      以下是您可以报考的{tab}科类
                    </Typography.Paragraph>
                    <Divider style={{ margin: '12px 0' }} />
                    {groupedResults[tab].length > 0 ? (
                      <ul
                        style={{
                          textAlign: 'left',
                          padding: 0,
                          listStyle: 'none'
                        }}
                      >
                        {groupedResults[tab].map((m) => (
                          <li
                            key={`${tab}-${m.category}`}
                            style={{ margin: '8px 0', fontSize: 16 }}
                          >
                            <Space>
                              <span>{m.category}</span>
                              <Tag color={tab === '本科' ? 'success' : 'purple'}>
                                高出{m.difference}分
                              </Tag>
                              {/* 排名信息 */}
                              {(() => {
                                const dist = distrubutionsData.find(
                                  (d) =>
                                    d.category === m.category &&
                                    d.type === m.type
                                );
                                if (!dist) {
                                  return (
                                    <Tag
                                      color="orange"
                                      style={{ fontWeight: 500 }}
                                    >
                                      暂无排名数据
                                    </Tag>
                                  );
                                }
                                if (typeof score === 'number') {
                                  const sorted = [...dist.scoreData].sort(
                                    (a, b) => b.score - a.score
                                  );
                                  const total =
                                    sorted.length > 0
                                      ? sorted[sorted.length - 1].cumulative
                                      : 0;
                                  let found = sorted.find(
                                    (d) => d.score <= score
                                  );
                                  if (!found && sorted.length > 0)
                                    found = sorted[sorted.length - 1];
                                  if (found) {
                                    const percentile = (
                                      (found.cumulative / total) *
                                      100
                                    ).toFixed(2);
                                    return (
                                      <Tag
                                        color="blue"
                                        style={{ fontWeight: 500 }}
                                      >
                                        排名: {found.cumulative} / {total}
                                        （超越{percentile}%考生）
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
                    ) : (
                      <Typography.Text type="warning">
                        暂无可报考科类
                      </Typography.Text>
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
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          数据来源：
          <a
            href="https://eea.gd.gov.cn/bmbk/kszs/"
            target="_blank"
            rel="noopener noreferrer"
          >
            广东省教育考试院
          </a>
          ，仅供参考
        </Typography.Paragraph>
      </Layout.Content>
    </Layout>
  );
}
