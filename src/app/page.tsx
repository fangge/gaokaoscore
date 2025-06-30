'use client';
import React, { useState, useMemo, useEffect } from 'react';
import gaokaoData from '../../data/gaokao_lines.json';
import scoreDistributions from '../../data/score_distributions.json';
import scoreMajor2024 from '../../data/score_major_2024.json';
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
  Divider,
  Table
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
type ScoreMajorItem = {
  schoolid: number;
  schoolname: string;
  majorid: number;
  minscore: number;
  extinfo: string;
};
// 用于Table渲染的类型，schoolid/majorid为string
type ScoreMajorTableItem = {
  schoolid: string;
  schoolname: string;
  majorid: string;
  minscore: number;
  extinfo: string;
};
type ScoreMajor2024 = {
  physics: ScoreMajorItem[] | ScoreMajorItem[][];
  history: ScoreMajorItem[] | ScoreMajorItem[][];
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
  // tab: main为原分数线，major2024为2024专业组
  const [mainTab, setMainTab] = useState<'main' | 'major2024'>('main');
  // 原有tab
  const [tab, setTab] = useState<'本科' | '专科'>('本科');
  // 2024专业组tab
  const [majorTab, setMajorTab] = useState<'physics' | 'history'>('physics');
  const [score, setScore] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [matchedResults, setMatchedResults] = useState<
    { type: '本科' | '专科'; category: string; difference: number }[]
  >([]);
  const [hasMatched, setHasMatched] = useState<boolean>(false);
  const [selectedDistributionCategory, setSelectedDistributionCategory] =
    useState<string | null>(null);
  const resultCardRef = React.useRef<HTMLDivElement>(null);

  // 2024专业组数据处理
  const scoreMajorData: ScoreMajor2024 = scoreMajor2024 as ScoreMajor2024;
  // 兼容物理组数据为二维数组
  const flattenMajor = (arr: ScoreMajorItem[] | ScoreMajorItem[][]) =>
    Array.isArray(arr[0])
      ? (arr as ScoreMajorItem[][]).flat()
      : (arr as ScoreMajorItem[]);

  // 2024专业组投档线搜索相关
  const [majorSearch, setMajorSearch] = useState<{
    schoolid: string;
    schoolname: string;
  }>({ schoolid: '', schoolname: '' });

  // 切换物理/历史tab时重置搜索
  useEffect(() => {
    setMajorSearch({ schoolid: '', schoolname: '' });
  }, [majorTab]);

  // 匹配2024专业组
  const matchedMajor2024 = useMemo(() => {
    if (typeof score !== 'number' || isNaN(score))
      return { physics: [], history: [] };
    const filterFn = (arr: ScoreMajorItem[] | ScoreMajorItem[][]) =>
      flattenMajor(arr).filter(
        (item) =>
          typeof item.minscore === 'number' &&
          !isNaN(item.minscore) &&
          score >= item.minscore
      );
    return {
      physics: filterFn(scoreMajorData.physics),
      history: filterFn(scoreMajorData.history)
    };
  }, [score, scoreMajorData]);

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
      (d) => d.category === selectedDistributionCategory && d.type === tab
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
        style={{ width: '98vw', margin: '0 auto', padding: '0 12px 24px' }}
      >
        {/* 新增主tab：分数线/2024本科专业组 */}
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <Tabs
            activeKey={mainTab}
            onChange={(k) => setMainTab(k as 'main' | 'major2024')}
            items={[
              { key: 'main', label: '分数线匹配' },
              { key: 'major2024', label: '2024本科普通批专业组投档线' }
            ]}
            tabBarGutter={32}
          />
          {/* 分数输入区，两个tab共用 */}
          <Space wrap align="center" style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 500 }}>输入高考分数：</span>
            <InputNumber
              min={0}
              max={750}
              value={score ?? undefined}
              onChange={(v) => {
                if (typeof v === 'number' && !isNaN(v)) {
                  setScore(v);
                } else {
                  setScore(null);
                  setHasMatched(false);
                  setMatchedResults([]);
                }
              }}
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
              匹配
            </button>
          </Space>
          {mainTab === 'main' && (
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
                    icon={
                      <CheckCircleTwoTone twoToneColor={token.colorSuccess} />
                    }
                    title={`${tab}可报考科类`}
                    subTitle={
                      <div style={{ marginTop: 16 }}>
                        <Typography.Text strong style={{ fontSize: 16 }}>
                          您的分数：{score}分
                        </Typography.Text>
                        <Typography.Paragraph
                          style={{
                            marginTop: 8,
                            color: token.colorTextSecondary
                          }}
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
                                  <Tag
                                    color={
                                      tab === '本科' ? 'success' : 'purple'
                                    }
                                  >
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
          )}
          {mainTab === 'main' ? (
            <>
              <Tabs
                activeKey={tab}
                onChange={(k) => setTab(k as '本科' | '专科')}
                items={[
                  { key: '本科', label: '本科' },
                  { key: '专科', label: '专科' }
                ]}
                tabBarGutter={32}
              />
              <Space
                direction="vertical"
                size="large"
                style={{ width: '100%' }}
              >
                <Space wrap align="center">
                  <span style={{ fontWeight: 500, marginLeft: 0 }}>
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
                  style={{
                    marginTop: 16,
                    background: '#fafcff',
                    borderRadius: 8
                  }}
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
            </>
          ) : (
            <React.Fragment>
              <Card
                type="inner"
                style={{
                  marginTop: 16,
                  background: '#fafcff',
                  borderRadius: 8
                }}
                bodyStyle={{ padding: 0 }}
              >
                <Tabs
                  activeKey={majorTab}
                  onChange={(k) => setMajorTab(k as 'physics' | 'history')}
                  items={[
                    { key: 'physics', label: '首选物理组' },
                    { key: 'history', label: '首选历史组' }
                  ]}
                  tabBarGutter={32}
                />
                <div style={{ padding: 16 }}>
                  <Table<ScoreMajorTableItem>
                    rowKey={(row: ScoreMajorTableItem): string =>
                      `${row.schoolid}-${row.majorid}`
                    }
                    columns={[
                      {
                        title: '院校代码',
                        dataIndex: 'schoolid',
                        align: 'center',
                        width: 100,
                        sorter: (a, b) =>
                          Number(a.schoolid) - Number(b.schoolid),
                        filterDropdown: ({
                          setSelectedKeys,
                          selectedKeys,
                          confirm,
                          clearFilters
                        }) => (
                          <div style={{ padding: 8 }}>
                            <InputNumber
                              placeholder="搜索院校代码"
                              value={
                                selectedKeys[0] !== undefined &&
                                selectedKeys[0] !== null
                                  ? Number(String(selectedKeys[0]))
                                  : undefined
                              }
                              onChange={(
                                v: number | string | bigint | null | undefined
                              ) => {
                                if (
                                  v === undefined ||
                                  v === null ||
                                  Number.isNaN(v)
                                ) {
                                  setSelectedKeys([]);
                                } else {
                                  const val =
                                    typeof v === 'bigint' ? v.toString() : v;
                                  setSelectedKeys([String(val)]);
                                }
                              }}
                              style={{
                                width: 120,
                                marginBottom: 8,
                                display: 'block'
                              }}
                              onPressEnter={() => confirm()}
                            />
                            <Space>
                              <button
                                onClick={() => confirm()}
                                style={{
                                  color: '#1677ff',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer'
                                }}
                                type="button"
                              >
                                搜索
                              </button>
                              <button
                                onClick={() => clearFilters && clearFilters()}
                                style={{
                                  color: '#999',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer'
                                }}
                                type="button"
                              >
                                重置
                              </button>
                            </Space>
                          </div>
                        ),
                        filterIcon: (filtered) => (
                          <span
                            style={{ color: filtered ? '#1677ff' : undefined }}
                          >
                            🔍
                          </span>
                        ),
                        onFilter: (value, record) =>
                          String(record.schoolid).includes(
                            typeof value === 'bigint'
                              ? value.toString()
                              : String(value)
                          )
                      },
                      {
                        title: '院校名称',
                        dataIndex: 'schoolname',
                        align: 'center',
                        width: 180,
                        render: (text: string) => (
                          <span style={{ fontWeight: 500 }}>{text}</span>
                        ),
                        filterDropdown: ({
                          setSelectedKeys,
                          selectedKeys,
                          confirm,
                          clearFilters
                        }) => (
                          <div style={{ padding: 8 }}>
                            <input
                              placeholder="搜索院校名称"
                              value={
                                selectedKeys[0] !== undefined &&
                                selectedKeys[0] !== null
                                  ? String(selectedKeys[0])
                                  : ''
                              }
                              onChange={(e) =>
                                setSelectedKeys(
                                  e.target.value ? [e.target.value] : []
                                )
                              }
                              style={{
                                width: 140,
                                marginBottom: 8,
                                display: 'block'
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirm();
                              }}
                            />
                            <Space>
                              <button
                                onClick={() => confirm()}
                                style={{
                                  color: '#1677ff',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer'
                                }}
                                type="button"
                              >
                                搜索
                              </button>
                              <button
                                onClick={() => clearFilters && clearFilters()}
                                style={{
                                  color: '#999',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer'
                                }}
                                type="button"
                              >
                                重置
                              </button>
                            </Space>
                          </div>
                        ),
                        filterIcon: (filtered) => (
                          <span
                            style={{ color: filtered ? '#1677ff' : undefined }}
                          >
                            🔍
                          </span>
                        ),
                        onFilter: (value, record) =>
                          String(record.schoolname)
                            .toLowerCase()
                            .includes(String(value).toLowerCase())
                      },
                      {
                        title: '专业组',
                        dataIndex: 'majorid',
                        align: 'center',
                        width: 100
                      },
                      {
                        title: '投档最低分',
                        dataIndex: 'minscore',
                        align: 'center',
                        width: 120,
                        sorter: (a, b) => a.minscore - b.minscore,
                        defaultSortOrder: 'descend'
                      },
                      {
                        title: '备注',
                        dataIndex: 'extinfo',
                        align: 'center',
                        width: 220,
                        render: (text: string) => text || '-'
                      }
                    ]}
                    dataSource={
                      (typeof score === 'number' && !isNaN(score)
                        ? matchedMajor2024[majorTab]
                            .filter(
                              (item) =>
                                (!majorSearch.schoolid ||
                                  String(item.schoolid).includes(
                                    majorSearch.schoolid
                                  )) &&
                                (!majorSearch.schoolname ||
                                  item.schoolname.includes(
                                    majorSearch.schoolname
                                  ))
                            )
                            .sort((a, b) => b.minscore - a.minscore)
                            .map((item) => ({
                              ...item,
                              schoolid: String(item.schoolid),
                              majorid: String(item.majorid)
                            }))
                        : flattenMajor(scoreMajorData[majorTab])
                            .filter(
                              (item) =>
                                (!majorSearch.schoolid ||
                                  String(item.schoolid).includes(
                                    majorSearch.schoolid
                                  )) &&
                                (!majorSearch.schoolname ||
                                  item.schoolname.includes(
                                    majorSearch.schoolname
                                  ))
                            )
                            .sort((a, b) => b.minscore - a.minscore)
                            .map((item) => ({
                              ...item,
                              schoolid: String(item.schoolid),
                              majorid: String(item.majorid)
                            }))) as ScoreMajorTableItem[]
                    }
                    pagination={{
                      pageSize: 50,
                      showSizeChanger: true,
                      pageSizeOptions: [10, 20, 50, 100]
                    }}
                    scroll={{ x: 800, y: 520 }}
                    bordered
                    locale={{
                      emptyText: hasMatched ? '暂无可报考院校' : '暂无数据'
                    }}
                    size="middle"
                    style={{ background: '#fff', borderRadius: 8 }}
                  />
                  <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                    数据来源：<a href="https://www.gxeea.cn/view/content_1013_30535.htm" target="_blank">2024年本科普通批院校专业组投档最低分数线（首选历史科目组）</a>、<a href="https://www.gxeea.cn/view/content_1013_30534.htm" target="_blank">2024年本科普通批院校专业组投档最低分数线（首选物理科目组）</a>仅供参考
                  </div>
                </div>
              </Card>
            </React.Fragment>
          )}
        </Card>
        {/* 原有分数匹配结果卡片，仅在mainTab下显示 */}

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
