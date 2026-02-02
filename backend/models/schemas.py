"""
数据模型定义
"""
from dataclasses import dataclass, asdict
from typing import Optional, List
from datetime import date


@dataclass
class Agent:
    """经纪人数据模型"""
    agent_id: int
    income_2022: float = 0
    income_2023: float = 0
    income_2024: float = 0
    income_2025: float = 0
    fyp_2022: float = 0
    fyp_2023: float = 0
    fyp_2024: float = 0
    fyp_2025: float = 0
    ape_2022: float = 0
    ape_2023: float = 0
    ape_2024: float = 0
    ape_2025: float = 0
    fyc_2022: float = 0
    fyc_2023: float = 0
    fyc_2024: float = 0
    fyc_2025: float = 0
    education: Optional[str] = None
    region: Optional[str] = None
    years: Optional[int] = None
    personal_level: Optional[str] = None
    manager_level: Optional[str] = None
    director_level: Optional[str] = None
    join_date: Optional[date] = None
    team_leader_id: Optional[int] = None
    is_peer: Optional[str] = None
    md_qualified_2022: bool = False
    md_qualified_2023: bool = False
    md_qualified_2024: bool = False
    md_qualified_2025: bool = False

    def to_dict(self):
        return asdict(self)


@dataclass
class PointsRecord:
    """积分记录模型"""
    agent_id: int
    is_active: str
    transaction_type: str  # 积分扣减 / 积分发放
    amount: float
    category: str
    director_team_amount: float
    transaction_time: str
    channel: str
    order_name: Optional[str] = None
    order_id: Optional[str] = None
    remark: Optional[str] = None


@dataclass
class SocialSecurityRecord:
    """社保公积金记录模型"""
    name: str
    service_month: str
    company_total: float  # 企业承担小计
    personal_total: float  # 个人承担小计
    region: Optional[str] = None
    matched_agent_id: Optional[int] = None


@dataclass
class MarginAnalysis:
    """边际贡献分析结果"""
    group_name: str
    agent_count: int
    total_fyc: float
    total_income: float
    total_points: float
    total_social_security: float
    margin: float
    margin_rate: float
    avg_fyp: float
    avg_ape: float
    avg_fyc: float
    avg_margin: float


@dataclass
class RetentionAnalysis:
    """留存分析结果"""
    group_name: str
    base_year: int
    years_after_join: int
    base_count: int
    current_count: int
    count_retention_rate: float
    base_fyp: float
    current_fyp: float
    amount_retention_rate: float


@dataclass
class EfficiencyTrend:
    """人效走势"""
    group_name: str
    year: int
    agent_count: int
    avg_fyp: float
    avg_ape: float
    avg_fyc: float
    avg_margin: float
    yoy_change: Optional[float] = None
    qoq_change: Optional[float] = None


# FYP/APE分层定义
FYP_APE_TIERS = [
    (0, 50000, "0-5万"),
    (50000, 100000, "5-10万"),
    (100000, 300000, "10-30万"),
    (300000, 500000, "30-50万"),
    (500000, float('inf'), "50万+")
]


def get_tier(value: float) -> str:
    """根据金额获取分层"""
    for low, high, label in FYP_APE_TIERS:
        if low <= value < high:
            return label
    return "50万+"
