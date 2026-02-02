"""
数据存储服务
使用SQLite存储和查询数据
"""
import sqlite3
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
import json


class DataStore:
    """数据存储管理器"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_db()

    def _get_conn(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """初始化数据库表"""
        conn = self._get_conn()
        cursor = conn.cursor()

        # 经纪人主表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agents (
                agent_id INTEGER PRIMARY KEY,
                income_2022 REAL DEFAULT 0,
                income_2023 REAL DEFAULT 0,
                income_2024 REAL DEFAULT 0,
                income_2025 REAL DEFAULT 0,
                fyp_2022 REAL DEFAULT 0,
                fyp_2023 REAL DEFAULT 0,
                fyp_2024 REAL DEFAULT 0,
                fyp_2025 REAL DEFAULT 0,
                ape_2022 REAL DEFAULT 0,
                ape_2023 REAL DEFAULT 0,
                ape_2024 REAL DEFAULT 0,
                ape_2025 REAL DEFAULT 0,
                fyc_2022 REAL DEFAULT 0,
                fyc_2023 REAL DEFAULT 0,
                fyc_2024 REAL DEFAULT 0,
                fyc_2025 REAL DEFAULT 0,
                education TEXT,
                region TEXT,
                years INTEGER,
                personal_level TEXT,
                manager_level TEXT,
                director_level TEXT,
                join_date TEXT,
                join_year INTEGER,
                team_leader_id INTEGER,
                is_peer TEXT,
                md_qualified_2022 INTEGER DEFAULT 0,
                md_qualified_2023 INTEGER DEFAULT 0,
                md_qualified_2024 INTEGER DEFAULT 0,
                md_qualified_2025 INTEGER DEFAULT 0,
                updated_at TEXT
            )
        ''')

        # 积分记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER,
                is_active TEXT,
                transaction_type TEXT,
                amount REAL,
                category TEXT,
                director_team_amount REAL,
                transaction_time TEXT,
                transaction_year INTEGER,
                channel TEXT,
                order_name TEXT,
                order_id TEXT,
                remark TEXT,
                FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
            )
        ''')

        # 社保公积金记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS social_security (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                bill_name TEXT,
                service_month TEXT,
                company_total REAL,
                personal_total REAL,
                total REAL,
                region TEXT,
                matched_agent_id INTEGER,
                FOREIGN KEY (matched_agent_id) REFERENCES agents(agent_id)
            )
        ''')

        # ID映射表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS id_mapping (
                pe_id TEXT PRIMARY KEY,
                uid INTEGER UNIQUE
            )
        ''')

        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_agents_region ON agents(region)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_agents_join_year ON agents(join_year)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_points_agent ON points(agent_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ss_agent ON social_security(matched_agent_id)')

        conn.commit()
        conn.close()

    def save_data(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        保存解析后的数据到数据库

        Args:
            parsed_data: 解析后的数据字典

        Returns:
            保存结果摘要
        """
        conn = self._get_conn()
        cursor = conn.cursor()

        result = {
            'agents_inserted': 0,
            'agents_updated': 0,
            'points_inserted': 0,
            'social_security_inserted': 0,
            'mapping_inserted': 0
        }

        now = datetime.now().isoformat()

        # 保存经纪人数据（使用UPSERT）
        for agent in parsed_data.get('agents', []):
            agent['updated_at'] = now

            # 处理日期字段
            if 'join_date' in agent and agent['join_date'] is not None:
                if hasattr(agent['join_date'], 'isoformat'):
                    agent['join_date'] = agent['join_date'].isoformat()

            # 处理布尔值
            for year in [2022, 2023, 2024, 2025]:
                key = f'md_qualified_{year}'
                if key in agent:
                    agent[key] = 1 if agent[key] else 0

            columns = [k for k in agent.keys() if k != 'agent_id']
            placeholders = ', '.join([f'{col} = ?' for col in columns])

            cursor.execute(f'''
                INSERT INTO agents (agent_id, {', '.join(columns)})
                VALUES (?, {', '.join(['?' for _ in columns])})
                ON CONFLICT(agent_id) DO UPDATE SET {placeholders}
            ''', [agent['agent_id']] + [agent.get(col) for col in columns] +
                [agent.get(col) for col in columns])

            if cursor.rowcount > 0:
                result['agents_inserted'] += 1

        # 保存积分数据
        for point in parsed_data.get('points', []):
            if 'transaction_time' in point and point['transaction_time'] is not None:
                if hasattr(point['transaction_time'], 'isoformat'):
                    point['transaction_time'] = point['transaction_time'].isoformat()

            cursor.execute('''
                INSERT INTO points (
                    agent_id, is_active, transaction_type, amount, category,
                    director_team_amount, transaction_time, transaction_year,
                    channel, order_name, order_id, remark
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                point.get('agent_id'),
                point.get('is_active'),
                point.get('transaction_type'),
                point.get('amount', 0),
                point.get('category'),
                point.get('director_team_amount', 0),
                point.get('transaction_time'),
                point.get('transaction_year'),
                point.get('channel'),
                point.get('order_name'),
                point.get('order_id'),
                point.get('remark')
            ))
            result['points_inserted'] += 1

        # 保存社保公积金数据
        for ss in parsed_data.get('social_security', []):
            cursor.execute('''
                INSERT INTO social_security (
                    name, bill_name, service_month, company_total,
                    personal_total, total, region, matched_agent_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                ss.get('name'),
                ss.get('bill_name'),
                ss.get('service_month'),
                ss.get('company_total', 0),
                ss.get('personal_total', 0),
                ss.get('total', 0),
                ss.get('region'),
                ss.get('matched_agent_id')
            ))
            result['social_security_inserted'] += 1

        # 保存ID映射
        for pe_id, uid in parsed_data.get('mapping', {}).items():
            cursor.execute('''
                INSERT OR REPLACE INTO id_mapping (pe_id, uid)
                VALUES (?, ?)
            ''', (pe_id, uid))
            result['mapping_inserted'] += 1

        conn.commit()
        conn.close()

        return result

    def get_filter_options(self) -> Dict[str, List]:
        """获取所有筛选器的可选值"""
        conn = self._get_conn()
        cursor = conn.cursor()

        options = {}

        # 区域
        cursor.execute('SELECT DISTINCT region FROM agents WHERE region IS NOT NULL')
        options['regions'] = [row[0] for row in cursor.fetchall()]

        # 入职年份
        cursor.execute('SELECT DISTINCT join_year FROM agents WHERE join_year IS NOT NULL ORDER BY join_year')
        options['join_years'] = [row[0] for row in cursor.fetchall()]

        # 是否同业
        cursor.execute('SELECT DISTINCT is_peer FROM agents WHERE is_peer IS NOT NULL')
        options['is_peer'] = [row[0] for row in cursor.fetchall()]

        # 个人职级
        cursor.execute('SELECT DISTINCT personal_level FROM agents WHERE personal_level IS NOT NULL')
        options['personal_levels'] = [row[0] for row in cursor.fetchall()]

        # 经理职级
        cursor.execute('SELECT DISTINCT manager_level FROM agents WHERE manager_level IS NOT NULL')
        options['manager_levels'] = [row[0] for row in cursor.fetchall()]

        # 总监职级
        cursor.execute('SELECT DISTINCT director_level FROM agents WHERE director_level IS NOT NULL')
        options['director_levels'] = [row[0] for row in cursor.fetchall()]

        # 学历
        cursor.execute('SELECT DISTINCT education FROM agents WHERE education IS NOT NULL')
        options['educations'] = [row[0] for row in cursor.fetchall()]

        # FYP/APE分层
        options['fyp_tiers'] = ['0-5万', '5-10万', '10-30万', '30-50万', '50万+']
        options['ape_tiers'] = ['0-5万', '5-10万', '10-30万', '30-50万', '50万+']

        # MD资格
        options['md_qualified'] = ['符合', '不符合']

        # 统计年份
        options['years'] = [2022, 2023, 2024, 2025]

        conn.close()
        return options

    def clear_all_data(self) -> None:
        """清空所有业务数据"""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM points')
        cursor.execute('DELETE FROM social_security')
        cursor.execute('DELETE FROM agents')
        cursor.execute('DELETE FROM id_mapping')
        conn.commit()
        conn.close()

    def get_agents(self, filters: Dict[str, Any] = None, year: int = 2024) -> List[Dict]:
        """
        根据筛选条件获取经纪人列表

        Args:
            filters: 筛选条件
            year: 统计年份

        Returns:
            经纪人列表
        """
        conn = self._get_conn()
        cursor = conn.cursor()

        query = 'SELECT * FROM agents WHERE 1=1'
        params = []

        if filters:
            if filters.get('region'):
                query += ' AND region = ?'
                params.append(filters['region'])

            if filters.get('join_year'):
                query += ' AND join_year = ?'
                params.append(filters['join_year'])

            if filters.get('is_peer'):
                query += ' AND is_peer = ?'
                params.append(filters['is_peer'])

            if filters.get('personal_level'):
                query += ' AND personal_level = ?'
                params.append(filters['personal_level'])

            if filters.get('manager_level'):
                query += ' AND manager_level = ?'
                params.append(filters['manager_level'])

            if filters.get('director_level'):
                query += ' AND director_level = ?'
                params.append(filters['director_level'])

            if filters.get('md_qualified'):
                col = f'md_qualified_{year}'
                if filters['md_qualified'] == '符合':
                    query += f' AND {col} = 1'
                else:
                    query += f' AND {col} = 0'

            # FYP分层筛选
            if filters.get('fyp_tier'):
                fyp_col = f'fyp_{year}'
                tier = filters['fyp_tier']
                query += self._get_tier_condition(fyp_col, tier)

            # APE分层筛选
            if filters.get('ape_tier'):
                ape_col = f'ape_{year}'
                tier = filters['ape_tier']
                query += self._get_tier_condition(ape_col, tier)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def _get_tier_condition(self, column: str, tier: str) -> str:
        """根据分层返回SQL条件"""
        tier_ranges = {
            '0-5万': (0, 50000),
            '5-10万': (50000, 100000),
            '10-30万': (100000, 300000),
            '30-50万': (300000, 500000),
            '50万+': (500000, float('inf'))
        }

        if tier in tier_ranges:
            low, high = tier_ranges[tier]
            if high == float('inf'):
                return f' AND {column} >= {low}'
            return f' AND {column} >= {low} AND {column} < {high}'
        return ''

    def get_agent_detail(self, agent_id: int) -> Optional[Dict]:
        """获取经纪人详情"""
        conn = self._get_conn()
        cursor = conn.cursor()

        # 获取经纪人基本信息
        cursor.execute('SELECT * FROM agents WHERE agent_id = ?', (agent_id,))
        agent = cursor.fetchone()

        if not agent:
            conn.close()
            return None

        result = dict(agent)

        # 获取积分汇总
        cursor.execute('''
            SELECT
                transaction_year,
                transaction_type,
                SUM(amount) as total_amount
            FROM points
            WHERE agent_id = ?
            GROUP BY transaction_year, transaction_type
        ''', (agent_id,))
        result['points_summary'] = [dict(row) for row in cursor.fetchall()]

        # 获取社保公积金汇总
        cursor.execute('''
            SELECT
                service_month,
                company_total,
                personal_total
            FROM social_security
            WHERE matched_agent_id = ?
            ORDER BY service_month
        ''', (agent_id,))
        result['social_security'] = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return result

    def get_agents_by_group(
        self,
        group_by: str,
        group_value: str,
        filters: Dict[str, Any] = None,
        year: int = 2024
    ) -> List[Dict]:
        """获取特定群组的经纪人列表"""
        filters = filters or {}
        filters[group_by] = group_value
        return self.get_agents(filters, year)

    def get_points_summary(self, agent_ids: List[int] = None, year: int = 2024) -> Dict[int, Dict]:
        """
        获取积分汇总

        Args:
            agent_ids: 经纪人ID列表，None表示全部
            year: 统计年份

        Returns:
            按经纪人ID索引的积分汇总
        """
        conn = self._get_conn()
        cursor = conn.cursor()

        query = '''
            SELECT
                agent_id,
                SUM(CASE WHEN transaction_type = '积分发放' THEN amount ELSE 0 END) as granted,
                SUM(CASE WHEN transaction_type = '积分扣减' THEN ABS(amount) ELSE 0 END) as used
            FROM points
            WHERE transaction_year = ?
        '''
        params = [year]

        if agent_ids:
            placeholders = ','.join(['?' for _ in agent_ids])
            query += f' AND agent_id IN ({placeholders})'
            params.extend(agent_ids)

        query += ' GROUP BY agent_id'

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        return {
            row['agent_id']: {
                'granted': row['granted'] or 0,
                'used': row['used'] or 0,
                'net': (row['granted'] or 0) - (row['used'] or 0)
            }
            for row in rows
        }

    def get_social_security_summary(
        self,
        agent_ids: List[int] = None,
        year: int = 2024
    ) -> Dict[int, float]:
        """
        获取社保公积金企业承担汇总

        Args:
            agent_ids: 经纪人ID列表
            year: 统计年份

        Returns:
            按经纪人ID索引的企业承担金额
        """
        conn = self._get_conn()
        cursor = conn.cursor()

        query = '''
            SELECT
                matched_agent_id,
                SUM(company_total) as total
            FROM social_security
            WHERE service_month LIKE ?
        '''
        params = [f'{year}%']

        if agent_ids:
            placeholders = ','.join(['?' for _ in agent_ids])
            query += f' AND matched_agent_id IN ({placeholders})'
            params.extend(agent_ids)

        query += ' GROUP BY matched_agent_id'

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        return {
            row['matched_agent_id']: row['total'] or 0
            for row in rows
        }

    def get_data_summary(self) -> Dict[str, Any]:
        """获取数据概览"""
        conn = self._get_conn()
        cursor = conn.cursor()

        summary = {}

        # 经纪人总数
        cursor.execute('SELECT COUNT(*) FROM agents')
        summary['total_agents'] = cursor.fetchone()[0]

        # 各年出单人数
        for year in [2022, 2023, 2024, 2025]:
            cursor.execute(f'SELECT COUNT(*) FROM agents WHERE fyp_{year} > 0')
            summary[f'active_agents_{year}'] = cursor.fetchone()[0]

        # 积分记录数
        cursor.execute('SELECT COUNT(*) FROM points')
        summary['total_points_records'] = cursor.fetchone()[0]

        # 社保记录数
        cursor.execute('SELECT COUNT(*) FROM social_security')
        summary['total_ss_records'] = cursor.fetchone()[0]

        # 已匹配的社保记录数
        cursor.execute('SELECT COUNT(*) FROM social_security WHERE matched_agent_id IS NOT NULL')
        summary['matched_ss_records'] = cursor.fetchone()[0]

        # 最近一次数据更新时间
        cursor.execute('SELECT MAX(updated_at) FROM agents')
        summary['last_updated_at'] = cursor.fetchone()[0]

        conn.close()
        return summary
