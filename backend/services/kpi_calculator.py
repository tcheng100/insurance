"""
KPI计算引擎
计算边际贡献、留存率、人效等核心指标
"""
from typing import Dict, Any, List, Optional
from collections import defaultdict
import pandas as pd
import os


class KPICalculator:
    """KPI计算器"""

    # 分组字段映射
    GROUP_FIELDS = {
        'region': 'region',
        'join_year': 'join_year',
        'personal_level': 'personal_level',
        'manager_level': 'manager_level',
        'director_level': 'director_level',
        'education': 'education',
        'is_peer': 'is_peer'
    }

    def __init__(self, data_store):
        self.data_store = data_store

    def calculate_margin_analysis(
        self,
        filters: Dict[str, Any] = None,
        group_by: str = 'region',
        cross_group_by: str = None,
        year: int = 2024
    ) -> Dict[str, Any]:
        """
        计算边际贡献分析

        边际贡献 = FYC - 个人收入 - 积分授予 - 社保公积金企业承担

        Args:
            filters: 筛选条件
            group_by: 分组维度
            cross_group_by: 交叉分组维度（可选）
            year: 统计年份

        Returns:
            分析结果
        """
        # 获取经纪人数据
        agents = self.data_store.get_agents(filters, year)

        if not agents:
            return {'groups': [], 'summary': {}}

        agent_ids = [a['agent_id'] for a in agents]

        # 获取积分数据
        points_summary = self.data_store.get_points_summary(agent_ids, year)

        # 获取社保数据
        ss_summary = self.data_store.get_social_security_summary(agent_ids, year)

        # 计算每个经纪人的边际贡献
        for agent in agents:
            aid = agent['agent_id']
            fyc = agent.get(f'fyc_{year}', 0) or 0
            income = agent.get(f'income_{year}', 0) or 0

            # 积分净额（发放 - 扣减）
            points = points_summary.get(aid, {}).get('net', 0)

            # 社保公积金企业承担
            ss = ss_summary.get(aid, 0)

            # 计算边际贡献
            margin = fyc - income - points - ss
            margin_rate = margin / fyc if fyc > 0 else 0

            agent['points'] = points
            agent['social_security'] = ss
            agent['margin'] = margin
            agent['margin_rate'] = margin_rate

        # 分组计算
        if cross_group_by:
            result = self._cross_group_analysis(agents, group_by, cross_group_by, year)
        else:
            result = self._single_group_analysis(agents, group_by, year)

        # 计算汇总
        result['summary'] = self._calculate_summary(agents, year)

        return result

    def _single_group_analysis(
        self,
        agents: List[Dict],
        group_by: str,
        year: int
    ) -> Dict[str, Any]:
        """单维度分组分析"""
        groups = defaultdict(list)
        field = self.GROUP_FIELDS.get(group_by, group_by)

        for agent in agents:
            group_value = agent.get(field, '未知')
            if group_value is None:
                group_value = '未知'
            groups[str(group_value)].append(agent)

        result = []
        for group_name, group_agents in groups.items():
            stats = self._calculate_group_stats(group_agents, year)
            stats['group_name'] = group_name
            result.append(stats)

        # 按边际贡献率排序
        result.sort(key=lambda x: x['margin_rate'], reverse=True)

        return {'groups': result}

    def _cross_group_analysis(
        self,
        agents: List[Dict],
        row_by: str,
        col_by: str,
        year: int
    ) -> Dict[str, Any]:
        """交叉分组分析"""
        row_field = self.GROUP_FIELDS.get(row_by, row_by)
        col_field = self.GROUP_FIELDS.get(col_by, col_by)

        # 构建交叉表
        cross_data = defaultdict(lambda: defaultdict(list))

        for agent in agents:
            row_value = str(agent.get(row_field, '未知') or '未知')
            col_value = str(agent.get(col_field, '未知') or '未知')
            cross_data[row_value][col_value].append(agent)

        # 计算每个单元格的统计值
        rows = sorted(cross_data.keys())
        cols = set()
        for row_data in cross_data.values():
            cols.update(row_data.keys())
        cols = sorted(cols)

        matrix = []
        for row in rows:
            row_result = {'row_name': row, 'cells': []}
            for col in cols:
                cell_agents = cross_data[row].get(col, [])
                if cell_agents:
                    stats = self._calculate_group_stats(cell_agents, year)
                    stats['col_name'] = col
                else:
                    stats = {'col_name': col, 'agent_count': 0, 'margin_rate': 0}
                row_result['cells'].append(stats)

            # 行合计
            row_all = cross_data[row]
            all_agents = []
            for col_agents in row_all.values():
                all_agents.extend(col_agents)
            row_total = self._calculate_group_stats(all_agents, year)
            row_total['col_name'] = '合计'
            row_result['cells'].append(row_total)
            matrix.append(row_result)

        return {
            'columns': cols + ['合计'],
            'matrix': matrix
        }

    def _calculate_group_stats(self, agents: List[Dict], year: int) -> Dict[str, Any]:
        """计算分组统计值"""
        count = len(agents)
        if count == 0:
            return {
                'agent_count': 0,
                'total_fyc': 0,
                'total_income': 0,
                'total_points': 0,
                'total_social_security': 0,
                'total_margin': 0,
                'margin_rate': 0,
                'avg_fyp': 0,
                'avg_ape': 0,
                'avg_fyc': 0,
                'avg_margin': 0
            }

        total_fyc = sum(a.get(f'fyc_{year}', 0) or 0 for a in agents)
        total_income = sum(a.get(f'income_{year}', 0) or 0 for a in agents)
        total_fyp = sum(a.get(f'fyp_{year}', 0) or 0 for a in agents)
        total_ape = sum(a.get(f'ape_{year}', 0) or 0 for a in agents)
        total_points = sum(a.get('points', 0) for a in agents)
        total_ss = sum(a.get('social_security', 0) for a in agents)
        total_margin = sum(a.get('margin', 0) for a in agents)

        return {
            'agent_count': count,
            'total_fyc': round(total_fyc, 2),
            'total_income': round(total_income, 2),
            'total_points': round(total_points, 2),
            'total_social_security': round(total_ss, 2),
            'total_margin': round(total_margin, 2),
            'margin_rate': round(total_margin / total_fyc, 4) if total_fyc > 0 else 0,
            'avg_fyp': round(total_fyp / count, 2),
            'avg_ape': round(total_ape / count, 2),
            'avg_fyc': round(total_fyc / count, 2),
            'avg_margin': round(total_margin / count, 2)
        }

    def _calculate_summary(self, agents: List[Dict], year: int) -> Dict[str, Any]:
        """计算汇总统计"""
        stats = self._calculate_group_stats(agents, year)
        stats['year'] = year
        return stats

    def calculate_retention_analysis(
        self,
        filters: Dict[str, Any] = None,
        group_by: str = 'region'
    ) -> Dict[str, Any]:
        """
        计算留存分析

        以每个经纪人的入职年份为基准，按入职后年份统计留存

        Args:
            filters: 筛选条件
            group_by: 分组维度

        Returns:
            留存分析结果
        """
        # 获取所有经纪人数据（不限年份筛选）
        agents = self.data_store.get_agents(filters)

        if not agents:
            return {'groups': [], 'retention_data': []}

        field = self.GROUP_FIELDS.get(group_by, group_by)

        # 按分组维度组织数据
        groups = defaultdict(list)
        for agent in agents:
            group_value = str(agent.get(field, '未知') or '未知')
            groups[group_value].append(agent)

        result = []
        for group_name, group_agents in groups.items():
            retention = self._calculate_group_retention(group_agents)
            result.append({
                'group_name': group_name,
                'retention': retention
            })

        return {
            'groups': result,
            'years_after_join': list(range(1, 5))  # 第1-4年
        }

    def _calculate_group_retention(self, agents: List[Dict]) -> List[Dict]:
        """计算分组的留存率"""
        # 按入职年份分组
        by_join_year = defaultdict(list)
        for agent in agents:
            join_year = agent.get('join_year')
            if join_year:
                by_join_year[join_year].append(agent)

        retention_data = []
        years = [2022, 2023, 2024, 2025]

        for join_year, cohort in by_join_year.items():
            # 使用最早的数据年份作为基准
            # 如果入职年份在数据范围内，使用入职年份；否则使用第一个数据年份
            if join_year >= years[0]:
                base_year = join_year
            else:
                base_year = years[0]

            base_col = f'fyp_{base_year}'
            # 基准年的出单人
            base_active = [a for a in cohort if (a.get(base_col, 0) or 0) > 0]
            base_count = len(base_active)
            base_fyp = sum(a.get(base_col, 0) or 0 for a in base_active)

            if base_count == 0:
                continue

            cohort_retention = {
                'join_year': join_year,
                'base_year': base_year,  # 添加实际基准年
                'base_count': base_count,
                'base_fyp': round(base_fyp, 2),
                'years': []
            }

            # 计算各年的留存
            for year in years:
                years_after = year - base_year  # 相对于基准年的年数
                if years_after < 0:
                    continue

                fyp_col = f'fyp_{year}'
                # 计算基准年出单人在当年的留存
                current_active = [a for a in base_active if (a.get(fyp_col, 0) or 0) > 0]
                current_count = len(current_active)
                current_fyp = sum(a.get(fyp_col, 0) or 0 for a in current_active)

                cohort_retention['years'].append({
                    'year': year,
                    'years_after_join': years_after,
                    'count': current_count,
                    'fyp': round(current_fyp, 2),
                    'count_retention': round(current_count / base_count, 4) if base_count > 0 else 0,
                    'fyp_retention': round(current_fyp / base_fyp, 4) if base_fyp > 0 else 0
                })

            retention_data.append(cohort_retention)

        return retention_data

    def calculate_efficiency_trend(
        self,
        filters: Dict[str, Any] = None,
        group_by: str = 'region',
        metric: str = 'avg_fyp'
    ) -> Dict[str, Any]:
        """
        计算人效走势

        Args:
            filters: 筛选条件
            group_by: 分组维度
            metric: 指标类型 (avg_fyp, avg_ape, avg_fyc, avg_margin)

        Returns:
            人效走势数据
        """
        agents = self.data_store.get_agents(filters)

        if not agents:
            return {'groups': [], 'years': []}

        field = self.GROUP_FIELDS.get(group_by, group_by)

        # 按分组维度组织数据
        groups = defaultdict(list)
        for agent in agents:
            group_value = str(agent.get(field, '未知') or '未知')
            groups[group_value].append(agent)

        years = [2022, 2023, 2024, 2025]
        result = []

        for group_name, group_agents in groups.items():
            trend = []
            prev_value = None

            for year in years:
                # 计算当年出单人
                fyp_col = f'fyp_{year}'
                active_agents = [a for a in group_agents if (a.get(fyp_col, 0) or 0) > 0]
                count = len(active_agents)

                if count == 0:
                    trend.append({
                        'year': year,
                        'count': 0,
                        'value': 0,
                        'yoy_change': None
                    })
                    continue

                # 计算指标值
                if metric == 'avg_fyp':
                    total = sum(a.get(fyp_col, 0) or 0 for a in active_agents)
                elif metric == 'avg_ape':
                    ape_col = f'ape_{year}'
                    total = sum(a.get(ape_col, 0) or 0 for a in active_agents)
                elif metric == 'avg_fyc':
                    fyc_col = f'fyc_{year}'
                    total = sum(a.get(fyc_col, 0) or 0 for a in active_agents)
                elif metric == 'avg_margin':
                    # 需要计算边际贡献
                    total = self._calculate_total_margin(active_agents, year)
                else:
                    total = sum(a.get(fyp_col, 0) or 0 for a in active_agents)

                avg_value = total / count

                # 计算同比
                yoy_change = None
                if prev_value and prev_value > 0:
                    yoy_change = round((avg_value - prev_value) / prev_value, 4)

                trend.append({
                    'year': year,
                    'count': count,
                    'value': round(avg_value, 2),
                    'yoy_change': yoy_change
                })

                prev_value = avg_value

            result.append({
                'group_name': group_name,
                'trend': trend
            })

        return {
            'groups': result,
            'years': years,
            'metric': metric
        }

    def _calculate_total_margin(self, agents: List[Dict], year: int) -> float:
        """计算总边际贡献"""
        agent_ids = [a['agent_id'] for a in agents]
        points_summary = self.data_store.get_points_summary(agent_ids, year)
        ss_summary = self.data_store.get_social_security_summary(agent_ids, year)

        total_margin = 0
        for agent in agents:
            aid = agent['agent_id']
            fyc = agent.get(f'fyc_{year}', 0) or 0
            income = agent.get(f'income_{year}', 0) or 0
            points = points_summary.get(aid, {}).get('net', 0)
            ss = ss_summary.get(aid, 0)

            margin = fyc - income - points - ss
            total_margin += margin

        return total_margin

    def export_to_excel(
        self,
        params: Dict[str, Any],
        export_type: str
    ) -> str:
        """
        导出数据为Excel

        Args:
            params: 导出参数
            export_type: 导出类型

        Returns:
            导出文件路径
        """
        export_dir = os.path.join(
            os.path.dirname(__file__), '..', '..', 'data', 'exports'
        )
        os.makedirs(export_dir, exist_ok=True)

        filename = f'{export_type}_{pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        filepath = os.path.join(export_dir, filename)

        filters = params.get('filters', {})
        group_by = params.get('group_by', 'region')
        year = params.get('year', 2024)

        if export_type == 'margin':
            data = self.calculate_margin_analysis(filters, group_by, year=year)
            df = pd.DataFrame(data['groups'])
        elif export_type == 'retention':
            data = self.calculate_retention_analysis(filters, group_by)
            # 展平留存数据
            rows = []
            for group in data['groups']:
                for retention in group['retention']:
                    for year_data in retention['years']:
                        rows.append({
                            '分组': group['group_name'],
                            '入职年份': retention['join_year'],
                            '统计年份': year_data['year'],
                            '入职后年数': year_data['years_after_join'],
                            '出单人数': year_data['count'],
                            'FYP': year_data['fyp'],
                            '数量留存率': year_data['count_retention'],
                            '金额留存率': year_data['fyp_retention']
                        })
            df = pd.DataFrame(rows)
        elif export_type == 'efficiency':
            metric = params.get('metric', 'avg_fyp')
            data = self.calculate_efficiency_trend(filters, group_by, metric)
            rows = []
            for group in data['groups']:
                for year_data in group['trend']:
                    rows.append({
                        '分组': group['group_name'],
                        '年份': year_data['year'],
                        '出单人数': year_data['count'],
                        '指标值': year_data['value'],
                        '同比变化': year_data['yoy_change']
                    })
            df = pd.DataFrame(rows)
        else:
            raise ValueError(f'未知的导出类型: {export_type}')

        df.to_excel(filepath, index=False)
        return filepath
