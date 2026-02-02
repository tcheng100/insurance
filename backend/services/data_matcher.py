"""
数据匹配服务
用于社保公积金数据与经纪人的模糊匹配
"""
from pypinyin import lazy_pinyin
from typing import List, Dict, Any, Optional
import re


class DataMatcher:
    """社保数据模糊匹配器"""

    def __init__(self):
        # 地域别名映射
        self.region_aliases = {
            '北京': ['北京', '京'],
            '上海': ['上海', '沪'],
            '广州': ['广州', '穗'],
            '深圳': ['深圳', '深'],
            '江苏': ['江苏', '苏', '南京', '苏州', '无锡', '常州', '镇江', '扬州'],
            '浙江': ['浙江', '浙', '杭州', '宁波', '温州', '绍兴'],
            '广东': ['广东', '粤', '东莞', '佛山', '珠海', '中山'],
            '山东': ['山东', '鲁', '济南', '青岛', '烟台'],
            '四川': ['四川', '川', '成都'],
            '湖北': ['湖北', '鄂', '武汉'],
            '湖南': ['湖南', '湘', '长沙'],
            '河南': ['河南', '豫', '郑州'],
            '河北': ['河北', '冀', '石家庄'],
            '福建': ['福建', '闽', '福州', '厦门'],
            '安徽': ['安徽', '皖', '合肥'],
            '辽宁': ['辽宁', '辽', '沈阳', '大连'],
            '陕西': ['陕西', '陕', '西安'],
            '天津': ['天津', '津'],
            '重庆': ['重庆', '渝'],
        }

        # 构建反向映射
        self.alias_to_region = {}
        for region, aliases in self.region_aliases.items():
            for alias in aliases:
                self.alias_to_region[alias] = region

    def match_social_security(
        self,
        ss_records: List[Dict[str, Any]],
        agents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        将社保记录与经纪人进行匹配

        Args:
            ss_records: 社保记录列表
            agents: 经纪人列表

        Returns:
            添加了matched_agent_id的社保记录列表
        """
        # 构建经纪人索引：(拼音, 标准化地域) -> agent_id
        agent_index = self._build_agent_index(agents)

        matched_count = 0
        for record in ss_records:
            name = record.get('name', '')
            region = record.get('region', '')

            if not name:
                continue

            # 尝试匹配
            agent_id = self._find_match(name, region, agent_index)

            if agent_id:
                record['matched_agent_id'] = agent_id
                matched_count += 1

        return ss_records

    def _build_agent_index(self, agents: List[Dict]) -> Dict[tuple, int]:
        """
        构建经纪人索引

        Returns:
            {(拼音, 地域): agent_id} 的映射
        """
        index = {}

        for agent in agents:
            agent_id = agent.get('agent_id')
            region = agent.get('region', '')

            # 标准化地域
            std_region = self._normalize_region(region)

            # 由于我们没有经纪人姓名，这里假设需要其他方式匹配
            # 实际场景中可能需要从其他数据源获取姓名

            # 如果有姓名字段
            if 'name' in agent:
                pinyin = self._to_pinyin(agent['name'])
                index[(pinyin, std_region)] = agent_id

            # 备选：使用agent_id作为key
            index[('id', agent_id)] = agent_id

        return index

    def _find_match(
        self,
        name: str,
        region: str,
        agent_index: Dict[tuple, int]
    ) -> Optional[int]:
        """
        查找匹配的经纪人

        Args:
            name: 社保记录中的姓名
            region: 社保记录中的地域
            agent_index: 经纪人索引

        Returns:
            匹配的经纪人ID，未找到返回None
        """
        # 转换姓名为拼音
        pinyin = self._to_pinyin(name)

        # 标准化地域
        std_region = self._normalize_region(region)

        # 精确匹配：拼音 + 地域
        key = (pinyin, std_region)
        if key in agent_index:
            return agent_index[key]

        # 模糊匹配：只匹配拼音
        for (p, r), agent_id in agent_index.items():
            if p == pinyin:
                # 检查地域是否兼容
                if self._regions_compatible(std_region, r):
                    return agent_id

        # 更模糊的匹配：拼音相似度
        for (p, r), agent_id in agent_index.items():
            if self._pinyin_similar(pinyin, p):
                if self._regions_compatible(std_region, r):
                    return agent_id

        return None

    def _to_pinyin(self, name: str) -> str:
        """将姓名转换为拼音（小写无空格）"""
        if not name:
            return ''

        # 移除空格和特殊字符
        name = re.sub(r'[^\u4e00-\u9fa5a-zA-Z]', '', name)

        # 转换为拼音
        pinyin_list = lazy_pinyin(name)

        return ''.join(pinyin_list).lower()

    def _normalize_region(self, region: str) -> str:
        """标准化地域名称"""
        if not region:
            return ''

        # 查找标准地域名
        for alias, std in self.alias_to_region.items():
            if alias in region:
                return std

        return region

    def _regions_compatible(self, region1: str, region2: str) -> bool:
        """检查两个地域是否兼容（相同或有隶属关系）"""
        if not region1 or not region2:
            return True  # 如果有一个为空，视为兼容

        if region1 == region2:
            return True

        # 检查是否是同一省份
        std1 = self._normalize_region(region1)
        std2 = self._normalize_region(region2)

        return std1 == std2

    def _pinyin_similar(self, pinyin1: str, pinyin2: str, threshold: float = 0.8) -> bool:
        """检查两个拼音是否相似"""
        if not pinyin1 or not pinyin2:
            return False

        # 使用简单的编辑距离比较
        distance = self._levenshtein_distance(pinyin1, pinyin2)
        max_len = max(len(pinyin1), len(pinyin2))

        if max_len == 0:
            return True

        similarity = 1 - (distance / max_len)
        return similarity >= threshold

    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """计算编辑距离"""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def get_match_report(
        self,
        ss_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        生成匹配报告

        Args:
            ss_records: 已处理的社保记录

        Returns:
            匹配统计报告
        """
        total = len(ss_records)
        matched = sum(1 for r in ss_records if r.get('matched_agent_id'))
        unmatched = total - matched

        # 未匹配记录详情
        unmatched_records = [
            {'name': r.get('name'), 'region': r.get('region')}
            for r in ss_records
            if not r.get('matched_agent_id')
        ]

        return {
            'total_records': total,
            'matched_count': matched,
            'unmatched_count': unmatched,
            'match_rate': matched / total if total > 0 else 0,
            'unmatched_samples': unmatched_records[:10]  # 最多返回10条未匹配样本
        }
