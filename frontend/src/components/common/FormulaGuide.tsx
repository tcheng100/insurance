import React from 'react';
import { Card, Descriptions, Typography, Table } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const FormulaGuide: React.FC = () => {
  const tierColumns = [
    { title: '档位', dataIndex: 'tier', key: 'tier' },
    { title: '金额区间', dataIndex: 'range', key: 'range' },
  ];

  const tierData = [
    { key: '1', tier: '第1档', range: '0 - 5万' },
    { key: '2', tier: '第2档', range: '5万 - 10万' },
    { key: '3', tier: '第3档', range: '10万 - 30万' },
    { key: '4', tier: '第4档', range: '30万 - 50万' },
    { key: '5', tier: '第5档', range: '50万以上' },
  ];

  const dimensionData = [
    { key: '1', dimension: '区域', example: '北京、上海、深圳等' },
    { key: '2', dimension: '入职年份', example: '2010-2025年' },
    { key: '3', dimension: '是否同业', example: '同业、非同业' },
    { key: '4', dimension: '个人职级', example: '经纪人、观察期等' },
    { key: '5', dimension: '经理职级', example: '销售经理、高级销售经理等' },
    { key: '6', dimension: '总监职级', example: '销售总监等' },
    { key: '7', dimension: 'FYP分层', example: '按上表分为5档' },
    { key: '8', dimension: 'APE分层', example: '按上表分为5档' },
    { key: '9', dimension: '是否MD', example: '符合、不符合MD资格' },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={3}>
          <CalculatorOutlined /> 计算公式说明
        </Title>
        <Paragraph type="secondary">
          本系统基于Excel数据计算各项KPI指标，以下是详细的计算公式和业务规则说明。
        </Paragraph>
      </Card>

      {/* 边际贡献分析 */}
      <Card title="一、边际贡献分析" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label={<Text strong>边际贡献</Text>}>
            <Text code>边际贡献 = 公司FYC - 经纪人个人收入 - 当期授予积分 - 五险一金企业承担部分</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              • 当期授予积分：积分发放金额（1积分=1元）
              <br />
              • 五险一金：企业承担部分，通过姓名拼音+地域模糊匹配
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>边际贡献率</Text>}>
            <Text code>边际贡献率 = 边际贡献 / 公司FYC</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              用于衡量单位FYC产生的净利润比例
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>分组统计</Text>}>
            支持按以下维度分组分析：
            <br />
            • 单维度分组：选择一个维度查看各分组的边际贡献
            <br />
            • 交叉分组：选择两个维度生成交叉分析表
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 留存分析 */}
      <Card title="二、留存分析" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label={<Text strong>基准年规则</Text>}>
            <Text type="warning" strong>
              以每个经纪人的入职年份为基准
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              • 如果入职年份在数据范围内（2022-2025），使用入职年份作为基准
              <br />
              • 如果入职年份早于2022年，使用2022年作为基准年
              <br />
              • 留存率按"入职后第N年"统计（第0年、第1年、第2年...）
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>数量留存率</Text>}>
            <Text code>数量留存率 = 统计年出单人数 / 基准年出单人数</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              衡量经纪人队列的人员留存情况
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>金额留存率</Text>}>
            <Text code>金额留存率 = 统计年出单人FYP / 基准年出单人FYP</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              衡量经纪人队列的业绩留存情况（基准年出单人在统计年的FYP总和）
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>出单人判定</Text>}>
            <Text code>当年FYP &gt; 0 视为出单</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 人效走势 */}
      <Card title="三、人效走势分析" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label={<Text strong>人均FYP</Text>}>
            <Text code>人均FYP = 当年FYP总额 / 出单人数</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>人均APE</Text>}>
            <Text code>人均APE = 当年APE总额 / 出单人数</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>人均FYC</Text>}>
            <Text code>人均FYC = 当年FYC总额 / 出单人数</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>人均边际贡献</Text>}>
            <Text code>人均边际贡献 = 当年边际贡献总额 / 出单人数</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>同比变化</Text>}>
            <Text code>同比变化率 = (当年指标值 - 去年指标值) / 去年指标值</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* FYP/APE分层 */}
      <Card title="四、FYP/APE分层定义" style={{ marginBottom: 16 }}>
        <Table
          dataSource={tierData}
          columns={tierColumns}
          pagination={false}
          size="small"
          bordered
        />
        <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 13 }}>
          注：FYP和APE采用相同的分层标准
        </Paragraph>
      </Card>

      {/* 筛选维度 */}
      <Card title="五、筛选维度说明" style={{ marginBottom: 16 }}>
        <Table
          dataSource={dimensionData}
          columns={[
            { title: '维度', dataIndex: 'dimension', key: 'dimension' },
            { title: '说明', dataIndex: 'example', key: 'example' },
          ]}
          pagination={false}
          size="small"
          bordered
        />
      </Card>

      {/* 数据匹配规则 */}
      <Card title="六、数据匹配规则">
        <Descriptions bordered column={1}>
          <Descriptions.Item label={<Text strong>积分数据</Text>}>
            • 积分发放：计入边际贡献成本（accrued金额）
            <br />
            • 积分扣减：cash out金额，不计入成本
            <br />
            • 换算比例：1积分 = 1元人民币
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>社保公积金匹配</Text>}>
            • 通过姓名转拼音 + 地域信息进行模糊匹配
            <br />
            • 匹配成功后，取企业承担部分计入边际贡献成本
            <br />
            • 未匹配记录不影响其他计算
          </Descriptions.Item>

          <Descriptions.Item label={<Text strong>ID映射</Text>}>
            • PE开头的经纪人ID与数字UID的对应关系
            <br />
            • 用于跨系统数据关联
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default FormulaGuide;
