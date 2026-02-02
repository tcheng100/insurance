import axios from 'axios';
import type {
  FilterOptions,
  Filters,
  MarginAnalysisResult,
  RetentionAnalysisResult,
  EfficiencyTrendResult,
  UploadResult,
  DataSummary,
  AgentDetail,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 健康检查
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.data.status === 'ok';
  } catch {
    return false;
  }
};

// 上传Excel文件
export const uploadFile = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 获取筛选器选项
export const getFilterOptions = async (): Promise<FilterOptions> => {
  const response = await api.get('/filters');
  return response.data;
};

// 清空数据
export const clearData = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/clear-data');
  return response.data;
};

// 获取数据概览
export const getDataSummary = async (): Promise<DataSummary> => {
  const response = await api.get('/summary');
  return response.data;
};

// 边际贡献分析
export const getMarginAnalysis = async (params: {
  filters?: Filters;
  group_by?: string;
  cross_group_by?: string;
  year?: number;
}): Promise<MarginAnalysisResult> => {
  const response = await api.post('/margin-analysis', {
    ...params.filters,
    group_by: params.group_by || 'region',
    cross_group_by: params.cross_group_by,
    year: params.year || 2024,
  });
  return response.data;
};

// 留存分析
export const getRetentionAnalysis = async (params: {
  filters?: Filters;
  group_by?: string;
}): Promise<RetentionAnalysisResult> => {
  const response = await api.post('/retention-analysis', {
    ...params.filters,
    group_by: params.group_by || 'region',
  });
  return response.data;
};

// 人效走势
export const getEfficiencyTrend = async (params: {
  filters?: Filters;
  group_by?: string;
  metric?: string;
}): Promise<EfficiencyTrendResult> => {
  const response = await api.post('/efficiency-trend', {
    ...params.filters,
    group_by: params.group_by || 'region',
    metric: params.metric || 'avg_fyp',
  });
  return response.data;
};

// 获取经纪人详情
export const getAgentDetail = async (agentId: number): Promise<AgentDetail> => {
  const response = await api.get(`/agent-detail/${agentId}`);
  return response.data;
};

// 获取群组内经纪人列表
export const getGroupAgents = async (params: {
  group_by: string;
  group_value: string;
  filters?: Filters;
  year?: number;
}): Promise<AgentDetail[]> => {
  const response = await api.post('/group-agents', params);
  return response.data;
};

// 导出数据
export const exportData = async (params: {
  type: 'margin' | 'retention' | 'efficiency';
  filters?: Filters;
  group_by?: string;
  year?: number;
  metric?: string;
}): Promise<string> => {
  const response = await api.post('/export', params);
  const downloadUrl: string = response.data.download_url;
  if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
    return downloadUrl;
  }
  const normalizedBase = API_BASE.endsWith('/api')
    ? API_BASE.slice(0, -4)
    : API_BASE;
  return `${normalizedBase}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
};

export default api;
