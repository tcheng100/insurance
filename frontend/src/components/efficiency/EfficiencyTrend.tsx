import React, { useEffect, useState } from 'react';
import { Card, Table, Spin, Empty, Radio, Button, Row, Col, Statistic } from 'antd';
import { DownloadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFilters } from '../../context/FilterContext';
import { getEfficiencyTrend, exportData } from '../../utils/api';
import type { EfficiencyTrendResult } from '../../types';
import {
  formatMoney,
  formatChange,
  GROUP_BY_LABELS,
  METRIC_LABELS,
  getChartColor,
} from '../../utils/formatters';

const EfficiencyTrend: React.FC = () => {
  const { filters, groupBy, selectedYear } = useFilters();
  const [data, setData] = useState<EfficiencyTrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState('avg_fyp');

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getEfficiencyTrend({
        filters,
        group_by: groupBy,
        metric,
      });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch efficiency trend:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, groupBy, metric]);

  const handleExport = async () => {
    try {
      const url = await exportData({
        type: 'efficiency',
        filters,
        group_by: groupBy,
        metric,
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

  if (!data || !data.groups || data.groups.length === 0) {
    return (
      <Card>
        <Empty description="暂无数据，请先上传Excel文件" />
      </Card>
    );
  }

  // 准备图表数据
  const prepareChartData = () => {
    const chartData: Record<string, any>[] = [];

    data.years.forEach(year => {
      const point: Record<string, any> = { year: year.toString() };

      data.groups.forEach(group => {
        const trendPoint = group.trend.find(t => t.year === year);
        point[group.group_name] = trendPoint ? trendPoint.value / 10000 : null;
      });

      chartData.push(point);
    });

    return chartData;
  };

  const chartData = prepareChartData();

  const calcChange = (current?: number, prev?: number): number | null => {
    if (current === undefined || prev === undefined || prev === 0) return null;
    return (current - prev) / prev;
  };

  // 计算选中年份的同比变化统计
  const selectedYearStats = () => {
    const stats: {
      group: string;
      value: number | null;
      yoy: number | null;
      years: { current: number; prev: number };
    }[] = [];

    const current = selectedYear;
    const prev = selectedYear - 1;

    data.groups.forEach(group => {
      const currentData = group.trend.find(t => t.year === current);
      const prevData = group.trend.find(t => t.year === prev);

      stats.push({
        group: group.group_name,
        value: currentData ? currentData.value : null,
        yoy: currentData ? calcChange(currentData.value, prevData?.value) : null,
        years: { current, prev },
      });
    });

    return stats.slice(0, 4); // 最多显示4个
  };

  const topStats = selectedYearStats();

  // 表格列
  const tableColumns = [
    {
      title: GROUP_BY_LABELS[groupBy] || '分组',
      dataIndex: 'group_name',
      key: 'group_name',
      fixed: 'left' as const,
      width: 120,
    },
    ...data.years.map(year => ({
      title: `${year}年`,
      children: [
        {
          title: METRIC_LABELS[metric] || '指标值',
          dataIndex: `value_${year}`,
          key: `value_${year}`,
          width: 120,
          render: (v: number | null) => (v !== null ? formatMoney(v) : '-'),
        },
        {
          title: '同比',
          dataIndex: `yoy_${year}`,
          key: `yoy_${year}`,
          width: 100,
          render: (v: number | null) => {
            if (v === null) return '-';
            const color = v >= 0 ? '#52c41a' : '#f5222d';
            const Icon = v >= 0 ? ArrowUpOutlined : ArrowDownOutlined;
            return (
              <span style={{ color }}>
                <Icon /> {formatChange(v)}
              </span>
            );
          },
        },
      ],
    })),
  ];

  // 准备表格数据
  const prepareTableData = () => {
    return data.groups.map(group => {
      const row: Record<string, any> = {
        key: group.group_name,
        group_name: group.group_name,
      };

      group.trend.forEach(t => {
        row[`value_${t.year}`] = t.value;
        row[`yoy_${t.year}`] = t.yoy_change;
      });

      return row;
    });
  };

  const tableData = prepareTableData();

  return (
    <>
      {/* 最新年份统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {topStats.map((stat) => (
          <Col span={6} key={stat.group}>
            <Card>
              <Statistic
                title={`${stat.group} - ${METRIC_LABELS[metric]}`}
                value={stat.value === null ? 'NA' : stat.value / 10000}
                precision={2}
                suffix={stat.value === null ? '' : '万'}
                valueStyle={{ fontSize: 24 }}
              />
              <div className="kpi-trend-list">
                {stat.yoy === null ? (
                  <div className="kpi-trend kpi-trend--muted">
                    <span className="kpi-trend__label">
                      同比 {stat.years.current}/{stat.years.prev}
                    </span>
                    <span className="kpi-trend__value">NA</span>
                  </div>
                ) : (
                  <div
                    className="kpi-trend"
                    style={{ color: stat.yoy >= 0 ? '#2e8b6e' : '#c43d4b' }}
                  >
                    <span className="kpi-trend__label">
                      {stat.yoy >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      {' '}同比 {stat.years.current}/{stat.years.prev}
                    </span>
                    <span className="kpi-trend__value">{formatChange(stat.yoy)}</span>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 指标选择和走势图 */}
      <Card
        title="人效走势"
        style={{ marginBottom: 16 }}
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={metric}
            onChange={e => setMetric(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="avg_fyp">人均FYP</Radio.Button>
            <Radio.Button value="avg_ape">人均APE</Radio.Button>
            <Radio.Button value="avg_fyc">人均FYC</Radio.Button>
            <Radio.Button value="avg_margin">人均边际贡献</Radio.Button>
          </Radio.Group>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis unit="万" />
            <Tooltip
              formatter={(value) =>
                value != null ? [`${Number(value).toFixed(2)}万`, METRIC_LABELS[metric]] : ['-']
              }
            />
            <Legend />
            {data.groups.map((group, index) => (
              <Line
                key={group.group_name}
                type="monotone"
                dataKey={group.group_name}
                stroke={getChartColor(index)}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 明细表格 */}
      <Card title="同比/环比分析">
        <Table
          dataSource={tableData}
          columns={tableColumns}
          scroll={{ x: 1200 }}
          pagination={false}
          size="small"
          bordered
        />
      </Card>
    </>
  );
};

export default EfficiencyTrend;
