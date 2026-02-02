import React, { useState } from 'react';
import { Select, Button, Card, Row, Col, Radio, Divider, Modal, Badge } from 'antd';
import { ClearOutlined, FilterOutlined } from '@ant-design/icons';
import { useFilters } from '../../context/FilterContext';
import { GROUP_BY_LABELS } from '../../utils/formatters';

const { Option } = Select;

interface FilterBarProps {
  hideYearSelector?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ hideYearSelector = false }) => {
  const {
    filters,
    updateFilter,
    clearFilters,
    filterOptions,
    loading,
    selectedYear,
    setSelectedYear,
    groupBy,
    setGroupBy,
    crossGroupBy,
    setCrossGroupBy,
  } = useFilters();

  const [advancedFilterVisible, setAdvancedFilterVisible] = useState(false);

  if (loading || !filterOptions) {
    return <Card loading={loading} />;
  }

  // 计算已激活的高级筛选数量
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null).length;

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        {/* 核心控制区 */}
        <Row gutter={[16, 12]} align="middle">
          {/* 年份选择 */}
          {!hideYearSelector && (
            <Col>
              <span style={{ marginRight: 8, fontWeight: 500 }}>统计年份:</span>
              <Radio.Group
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                buttonStyle="solid"
              >
                {filterOptions.years.map(year => (
                  <Radio.Button key={year} value={year}>
                    {year}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Col>
          )}

          {hideYearSelector && (
            <Col flex="auto">
              <span style={{ color: '#666', fontSize: 13 }}>
                💡 留存分析基于入职年份，自动追踪所有年份数据
              </span>
            </Col>
          )}

          {/* 分组维度 */}
          <Col>
            <span style={{ marginRight: 8, fontWeight: 500 }}>分组:</span>
            <Select
              value={groupBy}
              onChange={setGroupBy}
              style={{ width: 120 }}
            >
              {Object.entries(GROUP_BY_LABELS).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>
          </Col>

          {/* 交叉分组 */}
          <Col>
            <span style={{ marginRight: 8, fontWeight: 500 }}>交叉分组:</span>
            <Select
              value={crossGroupBy || undefined}
              onChange={setCrossGroupBy}
              style={{ width: 120 }}
              allowClear
              placeholder="无"
            >
              {Object.entries(GROUP_BY_LABELS)
                .filter(([key]) => key !== groupBy)
                .map(([key, label]) => (
                  <Option key={key} value={key}>
                    {label}
                  </Option>
                ))}
            </Select>
          </Col>

          <Col flex="auto" />

          {/* 高级筛选按钮 */}
          <Col>
            <Badge count={activeFilterCount} offset={[-5, 5]}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setAdvancedFilterVisible(true)}
              >
                高级筛选
              </Button>
            </Badge>
          </Col>

          {/* 清除筛选 */}
          <Col>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              清除筛选
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 高级筛选弹窗 */}
      <Modal
        title="高级筛选"
        open={advancedFilterVisible}
        onCancel={() => setAdvancedFilterVisible(false)}
        onOk={() => setAdvancedFilterVisible(false)}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <div style={{ padding: '16px 0' }}>
          <Row gutter={[16, 16]}>
            {/* 区域 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>区域</div>
              <Select
                value={filters.region}
                onChange={v => updateFilter('region', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.regions.map(r => (
                  <Option key={r} value={r}>
                    {r}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* 入职年份 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>入职年份</div>
              <Select
                value={filters.join_year}
                onChange={v => updateFilter('join_year', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.join_years.map(y => (
                  <Option key={y} value={y}>
                    {y}年
                  </Option>
                ))}
              </Select>
            </Col>

            {/* 是否同业 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>是否同业</div>
              <Select
                value={filters.is_peer}
                onChange={v => updateFilter('is_peer', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.is_peer.map(p => (
                  <Option key={p} value={p}>
                    {p}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* 个人职级 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>个人职级</div>
              <Select
                value={filters.personal_level}
                onChange={v => updateFilter('personal_level', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.personal_levels.map(l => (
                  <Option key={l} value={l}>
                    {l}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* 经理职级 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>经理职级</div>
              <Select
                value={filters.manager_level}
                onChange={v => updateFilter('manager_level', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.manager_levels.map(l => (
                  <Option key={l} value={l}>
                    {l}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* 总监职级 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>总监职级</div>
              <Select
                value={filters.director_level}
                onChange={v => updateFilter('director_level', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.director_levels.map(l => (
                  <Option key={l} value={l}>
                    {l}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* FYP分层 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>FYP分层</div>
              <Select
                value={filters.fyp_tier}
                onChange={v => updateFilter('fyp_tier', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.fyp_tiers.map(t => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* APE分层 */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>APE分层</div>
              <Select
                value={filters.ape_tier}
                onChange={v => updateFilter('ape_tier', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.ape_tiers.map(t => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* 是否MD */}
            <Col span={12}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>是否MD</div>
              <Select
                value={filters.md_qualified}
                onChange={v => updateFilter('md_qualified', v)}
                style={{ width: '100%' }}
                allowClear
                placeholder="全部"
              >
                {filterOptions.md_qualified.map(m => (
                  <Option key={m} value={m}>
                    {m}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>
      </Modal>
    </>
  );
};

export default FilterBar;
