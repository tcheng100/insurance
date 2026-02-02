import React, { useEffect, useState } from 'react';
import { Card, Table, Spin, Empty, Tabs, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
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
import { getRetentionAnalysis, exportData } from '../../utils/api';
import type { RetentionAnalysisResult } from '../../types';
import { formatPercent, GROUP_BY_LABELS, getChartColor } from '../../utils/formatters';

const RetentionAnalysis: React.FC = () => {
  const { filters, groupBy } = useFilters();
  const [data, setData] = useState<RetentionAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [retentionType, setRetentionType] = useState<'count' | 'fyp'>('count');

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getRetentionAnalysis({
        filters,
        group_by: groupBy,
      });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch retention analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, groupBy]);

  const handleExport = async () => {
    try {
      const url = await exportData({
        type: 'retention',
        filters,
        group_by: groupBy,
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
    const years = [0, 1, 2, 3]; // 入职后年份

    years.forEach(yearAfter => {
      const point: Record<string, any> = { year: `第${yearAfter}年` };

      data.groups.forEach(group => {
        // 汇总该分组所有队列的平均留存率
        let totalRetention = 0;
        let cohortCount = 0;

        group.retention.forEach(cohort => {
          const yearData = cohort.years.find(y => y.years_after_join === yearAfter);
          if (yearData) {
            totalRetention +=
              retentionType === 'count'
                ? yearData.count_retention
                : yearData.fyp_retention;
            cohortCount++;
          }
        });

        point[group.group_name] =
          cohortCount > 0 ? (totalRetention / cohortCount) * 100 : null;
      });

      chartData.push(point);
    });

    return chartData;
  };

  const chartData = prepareChartData();

  // 表格列
  const tableColumns = [
    {
      title: GROUP_BY_LABELS[groupBy] || '分组',
      dataIndex: 'group_name',
      key: 'group_name',
      fixed: 'left' as const,
      width: 120,
    },
    {
      title: '入职年份',
      dataIndex: 'join_year',
      key: 'join_year',
      width: 100,
    },
    {
      title: '基准人数',
      dataIndex: 'base_count',
      key: 'base_count',
      width: 100,
    },
    ...([0, 1, 2, 3].map(year => ({
      title: `第${year}年`,
      children: [
        {
          title: '人数',
          dataIndex: `count_${year}`,
          key: `count_${year}`,
          width: 80,
        },
        {
          title: '留存率',
          dataIndex: `retention_${year}`,
          key: `retention_${year}`,
          width: 80,
          render: (v: number | null) => (v !== null ? formatPercent(v) : '-'),
        },
      ],
    }))),
  ];

  // 准备表格数据
  const prepareTableData = () => {
    const rows: any[] = [];

    data.groups.forEach(group => {
      group.retention.forEach(cohort => {
        const row: Record<string, any> = {
          key: `${group.group_name}-${cohort.join_year}`,
          group_name: group.group_name,
          join_year: cohort.join_year,
          base_count: cohort.base_count,
        };

        cohort.years.forEach(y => {
          row[`count_${y.years_after_join}`] = y.count;
          row[`retention_${y.years_after_join}`] =
            retentionType === 'count' ? y.count_retention : y.fyp_retention;
        });

        rows.push(row);
      });
    });

    return rows;
  };

  const tableData = prepareTableData();

  return (
    <>
      {/* 留存率走势图 */}
      <Card
        title="留存率走势"
        style={{ marginBottom: 16 }}
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
        }
      >
        <Tabs
          activeKey={retentionType}
          onChange={key => setRetentionType(key as 'count' | 'fyp')}
          items={[
            { key: 'count', label: '数量留存' },
            { key: 'fyp', label: '金额留存' },
          ]}
        />

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip
              formatter={(value) =>
                value != null ? [`${Number(value).toFixed(2)}%`, '留存率'] : ['-', '留存率']
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

      {/* 留存明细表格 */}
      <Card title="留存明细">
        <Table
          dataSource={tableData}
          columns={tableColumns}
          scroll={{ x: 1000 }}
          pagination={false}
          size="small"
          bordered
        />
      </Card>
    </>
  );
};

export default RetentionAnalysis;
