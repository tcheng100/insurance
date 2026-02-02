import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, Typography, Spin, Alert, theme } from 'antd';
import {
  UploadOutlined,
  LineChartOutlined,
  BarChartOutlined,
  TeamOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { FilterProvider } from './context/FilterContext';
import FilterBar from './components/layout/FilterBar';
import FileUpload from './components/upload/FileUpload';
import MarginAnalysis from './components/margin/MarginAnalysis';
import RetentionAnalysis from './components/retention/RetentionAnalysis';
import EfficiencyTrend from './components/efficiency/EfficiencyTrend';
import FormulaGuide from './components/common/FormulaGuide';
import { healthCheck, getDataSummary } from './utils/api';
import type { DataSummary } from './types';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

type MenuKey = 'upload' | 'margin' | 'retention' | 'efficiency' | 'formula';

const App: React.FC = () => {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('margin');
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);

  const loadDataSummary = async () => {
    try {
      const summary = await getDataSummary();
      setDataSummary(summary);
    } catch (e) {
      console.error('Failed to get data summary');
    }
  };

  useEffect(() => {
    const checkApi = async () => {
      const connected = await healthCheck();
      setApiConnected(connected);

      if (connected) {
        await loadDataSummary();
      }
    };

    checkApi();
  }, []);

  const menuItems = [
    {
      key: 'upload',
      icon: <UploadOutlined />,
      label: '数据导入',
    },
    {
      key: 'margin',
      icon: <BarChartOutlined />,
      label: '边际贡献分析',
    },
    {
      key: 'retention',
      icon: <TeamOutlined />,
      label: '留存分析',
    },
    {
      key: 'efficiency',
      icon: <LineChartOutlined />,
      label: '人效走势',
    },
    {
      key: 'formula',
      icon: <CalculatorOutlined />,
      label: '公式说明',
    },
  ];

  const renderContent = () => {
    if (apiConnected === null) {
      return (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在连接后端服务...</div>
        </div>
      );
    }

    if (apiConnected === false) {
      return (
        <Alert
          type="error"
          message="无法连接到后端服务"
          description={
            <div>
              <p>请确保后端服务已启动：</p>
              <pre style={{ background: '#f5f5f5', padding: 8 }}>
                cd backend && pip install -r requirements.txt && python app.py
              </pre>
            </div>
          }
          showIcon
        />
      );
    }

    switch (selectedMenu) {
      case 'upload':
        return <FileUpload onUploadSuccess={loadDataSummary} />;
      case 'margin':
        return <MarginAnalysis />;
      case 'retention':
        return <RetentionAnalysis />;
      case 'efficiency':
        return <EfficiencyTrend />;
      case 'formula':
        return <FormulaGuide />;
      default:
        return <MarginAnalysis />;
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0b3d91',
          colorSuccess: '#2e8b6e',
          colorError: '#c43d4b',
          colorInfo: '#1f4fa3',
          colorBgLayout: '#eef3f9',
          colorBorderSecondary: '#e6edf7',
          borderRadius: 12,
        },
      }}
    >
      <FilterProvider>
        <Layout style={{ minHeight: '100vh' }}>
          <Sider width={200} theme="light">
            <div className="app-brand">
              <div className="app-brand__mark">IA</div>
              <div className="app-brand__text">
                <Title level={4} style={{ margin: 0, color: '#0b3d91' }}>
                  保险分析系统
                </Title>
                <div className="app-brand__subtitle">Insurance Analytics</div>
              </div>
            </div>

            <Menu
              mode="inline"
              selectedKeys={[selectedMenu]}
              onClick={e => setSelectedMenu(e.key as MenuKey)}
              items={menuItems}
              style={{ borderRight: 0 }}
            />

            {dataSummary && (
              <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', marginTop: 16 }}>
                <div style={{ fontSize: 13, lineHeight: '1.8' }}>
                  <div style={{ color: dataSummary.total_agents > 0 ? '#2e8b6e' : '#999', marginBottom: 8 }}>
                    {dataSummary.total_agents > 0 ? '✅ 数据已加载' : '⚠️ 暂无数据'}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    经纪人 {dataSummary.total_agents} | 积分记录 {dataSummary.total_points_records}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    社保记录 {dataSummary.total_ss_records} | 已匹配 {dataSummary.matched_ss_records}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    最近更新 {dataSummary.last_updated_at ? new Date(dataSummary.last_updated_at).toLocaleString() : 'NA'}
                  </Text>
                </div>
              </div>
            )}
          </Sider>

          <Layout>
            <Header
              style={{
                background: '#fff',
                padding: '0 24px',
                borderBottom: '1px solid #e6edf7',
              }}
            >
              <Title level={4} style={{ margin: '16px 0' }}>
                {menuItems.find(m => m.key === selectedMenu)?.label}
              </Title>
            </Header>

            <Content style={{ padding: 24, background: 'var(--app-bg)' }}>
              {selectedMenu !== 'upload' && selectedMenu !== 'formula' && (
                <FilterBar hideYearSelector={selectedMenu === 'retention'} />
              )}
              {renderContent()}
            </Content>
          </Layout>
        </Layout>
      </FilterProvider>
    </ConfigProvider>
  );
};

export default App;
