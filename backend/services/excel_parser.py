"""
Excel解析服务
解析保险数据Excel的4个Sheet
"""
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List


class ExcelParser:
    """Excel文件解析器"""

    # Sheet名称映射
    SHEET_NAMES = {
        'agents': '成本-其他利益',
        'points': '成本-积分',
        'social_security': '成本-社保公积金',
        'mapping': 'Mapping'
    }

    # 经纪人主数据列名映射
    AGENT_COLUMNS = {
        '经纪人id': 'agent_id',
        '经纪人ID': 'agent_id',
        '个人收入2022年': 'income_2022',
        '个人收入2023年': 'income_2023',
        '个人收入2024年': 'income_2024',
        '个人收入2025年': 'income_2025',
        '2022FYP': 'fyp_2022',
        '2023FYP': 'fyp_2023',
        '2024FYP': 'fyp_2024',
        '2025FYP': 'fyp_2025',
        '2022APE': 'ape_2022',
        '2023APE': 'ape_2023',
        '2024APE': 'ape_2024',
        '2025APE': 'ape_2025',
        '公司FYC2022': 'fyc_2022',
        '公司FYC2023': 'fyc_2023',
        '公司FYC2024': 'fyc_2024',
        '公司FYC2025': 'fyc_2025',
        '学历': 'education',
        '地域': 'region',
        '年限': 'years',
        '个人职级': 'personal_level',
        '经理职级': 'manager_level',
        '总监职级': 'director_level',
        '入职日期': 'join_date',
        '团队负责人ID': 'team_leader_id',
        '是否同业': 'is_peer',
        '符合MD资格指标2022': 'md_qualified_2022',
        '符合MD资格指标2023': 'md_qualified_2023',
        '符合MD资格指标2024': 'md_qualified_2024',
        '符合MD资格指标2025': 'md_qualified_2025'
    }

    # 积分数据列名映射
    POINTS_COLUMNS = {
        '销售人员工号': 'agent_id',
        '销售人员ID': 'agent_id',
        '销售人员id': 'agent_id',
        '在职': 'is_active',
        '处理类型': 'transaction_type',
        '收支数量': 'amount',
        '收支项目': 'category',
        '总监团队积分收支量': 'director_team_amount',
        '收支时间': 'transaction_time',
        '收支渠道': 'channel',
        '业务订单名称': 'order_name',
        '业务订单编号': 'order_id',
        '备注': 'remark'
    }

    def parse(self, filepath: str) -> Dict[str, Any]:
        """
        解析Excel文件

        Args:
            filepath: Excel文件路径

        Returns:
            解析后的数据字典
        """
        xlsx = pd.ExcelFile(filepath)
        result = {
            'agents': [],
            'points': [],
            'social_security': [],
            'mapping': {},
            'summary': {}
        }

        # 解析经纪人主数据
        if self.SHEET_NAMES['agents'] in xlsx.sheet_names:
            result['agents'] = self._parse_agents(xlsx)

        # 解析积分数据
        if self.SHEET_NAMES['points'] in xlsx.sheet_names:
            result['points'] = self._parse_points(xlsx)

        # 解析社保公积金数据
        if self.SHEET_NAMES['social_security'] in xlsx.sheet_names:
            result['social_security'] = self._parse_social_security(xlsx)

        # 解析ID映射
        if self.SHEET_NAMES['mapping'] in xlsx.sheet_names:
            result['mapping'] = self._parse_mapping(xlsx)

        # 生成摘要
        result['summary'] = {
            'agent_count': len(result['agents']),
            'points_records': len(result['points']),
            'social_security_records': len(result['social_security']),
            'mapping_count': len(result['mapping']),
            'parse_time': datetime.now().isoformat()
        }

        return result

    def _parse_agents(self, xlsx: pd.ExcelFile) -> List[Dict]:
        """解析经纪人主数据Sheet"""
        df = pd.read_excel(xlsx, sheet_name=self.SHEET_NAMES['agents'])

        # 重命名列
        df = df.rename(columns=self.AGENT_COLUMNS)

        # 数据清洗
        # 填充数值列的NaN为0
        numeric_cols = [col for col in df.columns if any(
            x in col for x in ['income', 'fyp', 'ape', 'fyc']
        )]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # 处理日期
        if 'join_date' in df.columns:
            df['join_date'] = pd.to_datetime(df['join_date'], errors='coerce')
            df['join_year'] = df['join_date'].dt.year

        # 处理MD资格指标
        for year in [2022, 2023, 2024, 2025]:
            col = f'md_qualified_{year}'
            if col in df.columns:
                df[col] = df[col].apply(lambda x: x == '符合' if pd.notna(x) else False)

        # 清除无效行（没有经纪人ID的）
        df = df.dropna(subset=['agent_id'])
        df['agent_id'] = df['agent_id'].apply(self._normalize_agent_id)
        df = df.dropna(subset=['agent_id'])

        return df.to_dict('records')

    def _parse_points(self, xlsx: pd.ExcelFile) -> List[Dict]:
        """解析积分数据Sheet"""
        df = pd.read_excel(xlsx, sheet_name=self.SHEET_NAMES['points'])

        # 重命名列
        df = df.rename(columns=self.POINTS_COLUMNS)

        # 清除无效行（包含注释的行）
        df = df.dropna(subset=['agent_id'])
        df = df[df['agent_id'].apply(lambda x: not str(x).startswith('注'))]
        df['agent_id'] = df['agent_id'].apply(self._normalize_agent_id)
        df = df.dropna(subset=['agent_id'])

        # 数据清洗
        if 'amount' in df.columns:
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)

        if 'director_team_amount' in df.columns:
            df['director_team_amount'] = pd.to_numeric(
                df['director_team_amount'], errors='coerce'
            ).fillna(0)

        # 解析交易时间提取年份
        if 'transaction_time' in df.columns:
            df['transaction_time'] = pd.to_datetime(df['transaction_time'], errors='coerce')
            df['transaction_year'] = df['transaction_time'].dt.year

        return df.to_dict('records')

    def _normalize_agent_id(self, value):
        """规范化经纪人/销售人员ID为整数"""
        if pd.isna(value):
            return None
        text = str(value).strip()
        if text == '':
            return None
        # 处理类似 12345.0
        if text.endswith('.0') and text.replace('.0', '').isdigit():
            return int(text.replace('.0', ''))
        if text.isdigit():
            return int(text)
        # 尝试将浮点数转换为整数
        try:
            num = float(text)
            if num.is_integer():
                return int(num)
        except ValueError:
            return None
        return None

    def _parse_social_security(self, xlsx: pd.ExcelFile) -> List[Dict]:
        """解析社保公积金数据Sheet"""
        df = pd.read_excel(xlsx, sheet_name=self.SHEET_NAMES['social_security'])

        # 这个Sheet结构比较复杂，有多层表头
        # 主要提取：姓名、服务年月、社保公积金企业小计

        result = []

        # 跳过表头行，找到数据行
        # 根据数据特征，第0行是二级表头，第1行开始是数据
        for idx, row in df.iterrows():
            # 跳过表头和注释行
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).startswith('注'):
                continue
            if row.iloc[0] == '序号':
                continue

            try:
                record = {
                    'sequence': row.iloc[0],
                    'bill_name': row.iloc[1],
                    'name': row.iloc[2],
                    'unique_id': row.iloc[3],
                    'id_card': row.iloc[4],
                    'client_code': row.iloc[5],
                    'service_month': row.iloc[6],
                    'company_total': self._safe_float(row.iloc[-3]),  # 社保公积金企业小计
                    'personal_total': self._safe_float(row.iloc[-2]),  # 社保公积金个人小计
                    'total': self._safe_float(row.iloc[-1])  # 小计
                }

                # 从账单名中提取地域信息
                if pd.notna(record['bill_name']):
                    record['region'] = self._extract_region(str(record['bill_name']))

                if pd.notna(record['name']) and record['company_total'] > 0:
                    result.append(record)
            except (IndexError, ValueError):
                continue

        return result

    def _parse_mapping(self, xlsx: pd.ExcelFile) -> Dict[str, int]:
        """解析ID映射Sheet"""
        df = pd.read_excel(xlsx, sheet_name=self.SHEET_NAMES['mapping'])

        mapping = {}
        for _, row in df.iterrows():
            if pd.notna(row['经纪人id']) and pd.notna(row['UID']):
                mapping[str(row['经纪人id'])] = int(row['UID'])

        return mapping

    def _safe_float(self, value) -> float:
        """安全转换为浮点数"""
        if pd.isna(value):
            return 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def _extract_region(self, bill_name: str) -> str:
        """从账单名称中提取地域信息"""
        # 示例：'保险北京代理江苏' -> 尝试提取省份/城市
        regions = [
            '北京', '上海', '广州', '深圳', '天津', '重庆',
            '江苏', '浙江', '广东', '山东', '河南', '四川',
            '湖北', '湖南', '河北', '福建', '安徽', '辽宁',
            '陕西', '江西', '云南', '贵州', '山西', '吉林',
            '黑龙江', '海南', '甘肃', '青海', '宁夏', '新疆',
            '西藏', '内蒙古', '广西', '常州', '苏州', '无锡',
            '南京', '杭州', '宁波', '温州', '成都', '武汉'
        ]

        for region in regions:
            if region in bill_name:
                return region

        return '其他'
