// 格式化金额（万元）
export const formatMoney = (value: number, decimals = 2): string => {
  if (value === 0) return '0';
  const wan = value / 10000;
  return `${wan.toFixed(decimals)}万`;
};

// 格式化百分比
export const formatPercent = (value: number, decimals = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

// 格式化变化率（带正负号）
export const formatChange = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  const percent = value * 100;
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
};

// 格式化数字（千分位）
export const formatNumber = (value: number): string => {
  return value.toLocaleString('zh-CN');
};

// 分组维度中文名映射
export const GROUP_BY_LABELS: Record<string, string> = {
  region: '区域',
  join_year: '入职年份',
  personal_level: '个人职级',
  manager_level: '经理职级',
  director_level: '总监职级',
  education: '学历',
  is_peer: '是否同业',
  fyp_tier: 'FYP分层',
  ape_tier: 'APE分层',
};

// 指标中文名映射
export const METRIC_LABELS: Record<string, string> = {
  avg_fyp: '人均FYP',
  avg_ape: '人均APE',
  avg_fyc: '人均FYC',
  avg_margin: '人均边际贡献',
};

// 颜色配置
export const CHART_COLORS = [
  '#0b3d91',
  '#2e8b6e',
  '#c43d4b',
  '#f0a202',
  '#1f4fa3',
  '#3a7bd5',
  '#7a5ea7',
  '#0f8aa3',
  '#9b6a3a',
  '#4b7f52',
];

// 获取图表颜色
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};
