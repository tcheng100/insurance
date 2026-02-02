// 筛选器选项
export interface FilterOptions {
  regions: string[];
  join_years: number[];
  is_peer: string[];
  personal_levels: string[];
  manager_levels: string[];
  director_levels: string[];
  educations: string[];
  fyp_tiers: string[];
  ape_tiers: string[];
  md_qualified: string[];
  years: number[];
}

// 筛选器状态
export interface Filters {
  region?: string;
  join_year?: number;
  is_peer?: string;
  personal_level?: string;
  manager_level?: string;
  director_level?: string;
  education?: string;
  fyp_tier?: string;
  ape_tier?: string;
  md_qualified?: string;
}

// 分组统计结果
export interface GroupStats {
  group_name: string;
  agent_count: number;
  total_fyc: number;
  total_income: number;
  total_points: number;
  total_social_security: number;
  total_margin: number;
  margin_rate: number;
  avg_fyp: number;
  avg_ape: number;
  avg_fyc: number;
  avg_margin: number;
}

// 边际贡献分析结果
export interface MarginAnalysisResult {
  groups: GroupStats[];
  summary: GroupStats & { year: number };
  columns?: string[];
  matrix?: CrossGroupRow[];
}

// 交叉分组行
export interface CrossGroupRow {
  row_name: string;
  cells: (GroupStats & { col_name: string })[];
}

// 留存年度数据
export interface RetentionYearData {
  year: number;
  years_after_join: number;
  count: number;
  fyp: number;
  count_retention: number;
  fyp_retention: number;
}

// 队列留存数据
export interface CohortRetention {
  join_year: number;
  base_count: number;
  base_fyp: number;
  years: RetentionYearData[];
}

// 分组留存数据
export interface GroupRetention {
  group_name: string;
  retention: CohortRetention[];
}

// 留存分析结果
export interface RetentionAnalysisResult {
  groups: GroupRetention[];
  years_after_join: number[];
}

// 人效趋势数据点
export interface TrendDataPoint {
  year: number;
  count: number;
  value: number;
  yoy_change: number | null;
}

// 分组趋势数据
export interface GroupTrend {
  group_name: string;
  trend: TrendDataPoint[];
}

// 人效走势分析结果
export interface EfficiencyTrendResult {
  groups: GroupTrend[];
  years: number[];
  metric: string;
}

// 上传结果
export interface UploadResult {
  success: boolean;
  message: string;
  summary: {
    agents_inserted: number;
    agents_updated: number;
    points_inserted: number;
    social_security_inserted: number;
    mapping_inserted: number;
  };
}

// 数据概览
export interface DataSummary {
  total_agents: number;
  active_agents_2022: number;
  active_agents_2023: number;
  active_agents_2024: number;
  active_agents_2025: number;
  total_points_records: number;
  total_ss_records: number;
  matched_ss_records: number;
  last_updated_at: string | null;
}

// 经纪人详情
export interface AgentDetail {
  agent_id: number;
  income_2022: number;
  income_2023: number;
  income_2024: number;
  income_2025: number;
  fyp_2022: number;
  fyp_2023: number;
  fyp_2024: number;
  fyp_2025: number;
  ape_2022: number;
  ape_2023: number;
  ape_2024: number;
  ape_2025: number;
  fyc_2022: number;
  fyc_2023: number;
  fyc_2024: number;
  fyc_2025: number;
  education: string;
  region: string;
  years: number;
  personal_level: string;
  manager_level: string;
  director_level: string;
  join_date: string;
  join_year: number;
  is_peer: string;
  points_summary: Array<{
    transaction_year: number;
    transaction_type: string;
    total_amount: number;
  }>;
  social_security: Array<{
    service_month: string;
    company_total: number;
    personal_total: number;
  }>;
}
