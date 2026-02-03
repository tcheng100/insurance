import React, { useEffect, useState } from 'react';
import { Card, Table, Row, Col, Statistic, Spin, Empty, Button } from 'antd';
import { DownloadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useFilters } from '../../context/FilterContext';
import { getMarginAnalysis, exportData } from '../../utils/api';
import type { MarginAnalysisResult, GroupStats } from '../../types';
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatChange,
  GROUP_BY_LABELS,
  getChartColor,
} from '../../utils/formatters';

const MarginAnalysis: React.FC = () => {
  const { filters, selectedYear, groupBy, crossGroupBy, filterOptions } = useFilters();
  const [data, setData] = useState<MarginAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryTrends, setSummaryTrends] = useState<{
    yoy: Record<string, number | null>;
    years: { current: number; prev: number };
  } | null>(null);

  const calcChange = (current?: number, prev?: number): number | null => {
    if (current === undefined || prev === undefined || prev === 0) return null;
    return (current - prev) / prev;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getMarginAnalysis({
        filters,
        group_by: groupBy,
        cross_group_by: crossGroupBy || undefined,
        year: selectedYear,
      });
      setData(result);

      const years = [...(filterOptions?.years || [])].sort((a, b) => a - b);
      const prevYear = years.filter(y => y < selectedYear).slice(-1)[0];

      if (prevYear) {
        const [prevSummary] = await Promise.all([
          getMarginAnalysis({
            filters,
            group_by: groupBy,
            cross_group_by: crossGroupBy || undefined,
            year: prevYear,
          }).then(r => r.summary),
        ]);

        const yoy = {
          total_fyc: calcChange(result.summary.total_fyc, prevSummary.total_fyc),
          total_margin: calcChange(result.summary.total_margin, prevSummary.total_margin),
          margin_rate: calcChange(result.summary.margin_rate, prevSummary.margin_rate),
          agent_count: calcChange(result.summary.agent_count, prevSummary.agent_count),
        };

        setSummaryTrends({
          yoy,
          years: { current: selectedYear, prev: prevYear },
        });
      } else {
        setSummaryTrends(null);
      }
    } catch (error) {
      console.error('Failed to fetch margin analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, selectedYear, groupBy, crossGroupBy]);

  const handleExport = async () => {
    try {
      const url = await exportData({
        type: 'margin',
        filters,
        group_by: groupBy,
        year: selectedYear,
      });
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <Empty description="暂无数据，请先上传Excel文件" />
      </Card>
    );
  }

  // 判断是否有数据
  const hasData = crossGroupBy
    ? (data.matrix && data.matrix.length > 0)
    : (data.groups && data.groups.length > 0);

  if (!hasData) {
    return (
      <Card>
        <Empty description="暂无数据，请调整筛选条件" />
      </Card>
    );
  }

  // 单维度分组的列定义
  const singleColumns = [
    {
      title: GROUP_BY_LABELS[groupBy] || '分组',
      dataIndex: 'group_name',
      key: 'group_name',
      fixed: 'left' as const,
      width: 120,
    },
    {
      title: '人数',
      dataIndex: 'agent_count',
      key: 'agent_count',
      sorter: (a: GroupStats, b: GroupStats) => a.agent_count - b.agent_count,
      width: 80,
    },
    {
      title: '总FYC',
      dataIndex: 'total_fyc',
      key: 'total_fyc',
      render: (v: number) => formatMoney(v),
      sorter: (a: GroupStats, b: GroupStats) => a.total_fyc - b.total_fyc,
      width: 120,
    },
    {
      title: '个人收入',
      dataIndex: 'total_income',
      key: 'total_income',
      render: (v: number) => formatMoney(v),
      width: 120,
    },
    {
      title: '积分',
      dataIndex: 'total_points',
      key: 'total_points',
      render: (v: number) => formatNumber(v),
      width: 100,
    },
    {
      title: '社保公积金',
      dataIndex: 'total_social_security',
      key: 'total_social_security',
      render: (v: number) => formatMoney(v),
      width: 120,
    },
    {
      title: '边际贡献',
      dataIndex: 'total_margin',
      key: 'total_margin',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#f5222d' }}>
          {formatMoney(v)}
        </span>
      ),
      sorter: (a: GroupStats, b: GroupStats) => a.total_margin - b.total_margin,
      width: 120,
    },
    {
      title: '边际贡献率',
      dataIndex: 'margin_rate',
      key: 'margin_rate',
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#f5222d', fontWeight: 500 }}>
          {formatPercent(v)}
        </span>
      ),
      sorter: (a: GroupStats, b: GroupStats) => a.margin_rate - b.margin_rate,
      width: 120,
    },
    {
      title: '人均FYP',
      dataIndex: 'avg_fyp',
      key: 'avg_fyp',
      render: (v: number) => formatMoney(v),
      width: 100,
    },
    {
      title: '人均APE',
      dataIndex: 'avg_ape',
      key: 'avg_ape',
      render: (v: number) => formatMoney(v),
      width: 100,
    },
  ];

  // 交叉分组的列定义
  const getCrossColumns = () => {
    if (!data.columns) return [];

    return [
      {
        title: `${GROUP_BY_LABELS[groupBy]}\\${GROUP_BY_LABELS[crossGroupBy!]}`,
        dataIndex: 'row_name',
        key: 'row_name',
        fixed: 'left' as const,
        width: 120,
      },
      ...data.columns.map(col => ({
        title: col,
        key: col,
        width: 150,
        children: [
          {
            title: '人数',
            key: `${col}_count`,
            width: 60,
            render: (_: any, record: any) => {
              const cell = record.cells?.find((c: any) => c.col_name === col);
              return cell?.agent_count || 0;
            },
          },
          {
            title: '边际贡献率',
            key: `${col}_rate`,
            width: 90,
            render: (_: any, record: any) => {
              const cell = record.cells?.find((c: any) => c.col_name === col);
              const rate = cell?.margin_rate || 0;
              return (
                <span style={{ color: rate >= 0 ? '#52c41a' : '#f5222d', fontWeight: 500 }}>
                  {formatPercent(rate)}
                </span>
              );
            },
          },
        ],
      })),
    ];
  };

  const chartData = !crossGroupBy && data.groups
    ? data.groups.slice(0, 10).map((g, i) => ({
        name: g.group_name,
        margin_rate: g.margin_rate * 100,
        color: getChartColor(i),
      }))
    : [];

  const renderTrend = (label: string, value: number | null) => {
    if (value === null || value === undefined) {
      return (
        <div className="kpi-trend kpi-trend--muted">
          <span className="kpi-trend__label">{label}</span>
          <span className="kpi-trend__value">NA</span>
        </div>
      );
    }
    const color = value >= 0 ? '#2e8b6e' : '#c43d4b';
    const Icon = value >= 0 ? ArrowUpOutlined : ArrowDownOutlined;
    return (
      <div className="kpi-trend" style={{ color }}>
        <span className="kpi-trend__label">
          <Icon /> {label}
        </span>
        <span className="kpi-trend__value">{formatChange(value)}</span>
      </div>
    );
  };

  return (
    <>
      {/* 汇总指标 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总FYC"
              value={data.summary.total_fyc / 10000}
              precision={2}
              suffix="万"
            />
            {summaryTrends && (
              <div className="kpi-trend-list">
                {renderTrend(
                  `同比 ${summaryTrends.years.current}/${summaryTrends.years.prev}`,
                  summaryTrends.yoy.total_fyc,
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总边际贡献"
              value={data.summary.total_margin / 10000}
              precision={2}
              suffix="万"
              valueStyle={{
                color: data.summary.total_margin >= 0 ? '#52c41a' : '#f5222d',
              }}
            />
            {summaryTrends && (
              <div className="kpi-trend-list">
                {renderTrend(
                  `同比 ${summaryTrends.years.current}/${summaryTrends.years.prev}`,
                  summaryTrends.yoy.total_margin,
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均边际贡献率"
              value={data.summary.margin_rate * 100}
              precision={2}
              suffix="%"
              valueStyle={{
                color: data.summary.margin_rate >= 0 ? '#52c41a' : '#f5222d',
              }}
            />
            {summaryTrends && (
              <div className="kpi-trend-list">
                {renderTrend(
                  `同比 ${summaryTrends.years.current}/${summaryTrends.years.prev}`,
                  summaryTrends.yoy.margin_rate,
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="经纪人数" value={data.summary.agent_count} suffix="人" />
            {summaryTrends && (
              <div className="kpi-trend-list">
                {renderTrend(
                  `同比 ${summaryTrends.years.current}/${summaryTrends.years.prev}`,
                  summaryTrends.yoy.agent_count,
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 边际贡献率图表 - 仅单维度分组时显示 */}
      {!crossGroupBy && chartData.length > 0 && (
        <Card
          title="边际贡献率分布"
          style={{ marginBottom: 16 }}
          extra={
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)}%`, '边际贡献率']}
              />
              <Bar dataKey="margin_rate" name="边际贡献率">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 详细数据表格 */}
      <Card
        title={crossGroupBy ? '交叉分组分析' : '分组明细'}
        extra={crossGroupBy && (
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
        )}
      >
        {crossGroupBy ? (
          <Table
            dataSource={data.matrix}
            columns={getCrossColumns()}
            rowKey="row_name"
            scroll={{ x: 1500 }}
            pagination={false}
            size="small"
            bordered
          />
        ) : (
          <Table
            dataSource={data.groups}
            columns={singleColumns}
            rowKey="group_name"
            scroll={{ x: 1200 }}
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </>
  );
};

export default MarginAnalysis;
