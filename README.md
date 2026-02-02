# 保险经纪人业绩分析系统

基于Excel数据的网页版分析系统，支持边际贡献分析、留存分析和人效走势分析。

## 功能特性

- **数据导入**: 上传Excel文件，自动解析经纪人数据、积分数据、社保数据
- **边际贡献分析**: 按区域/入职年份/职级等维度分析边际贡献率
- **留存分析**: 基于入职年份计算数量留存率和金额留存率
- **人效走势**: 人均FYP/APE/FYC/边际贡献的年度走势分析
- **多维筛选**: 支持9个维度的筛选和分组
- **数据导出**: 支持导出分析结果为Excel

## 技术栈

- **前端**: React 18 + TypeScript + Ant Design + Recharts
- **后端**: Python Flask + pandas
- **数据库**: SQLite
- **部署**: Docker Compose

## 快速开始

### 本地开发

1. 启动后端服务:

```bash
cd backend
pip install -r requirements.txt
python app.py
```

2. 启动前端服务:

```bash
cd frontend
npm install
npm run dev
```

3. 访问 http://localhost:5173

### Docker部署

```bash
docker-compose up -d
```

访问 http://localhost

## 数据格式要求

Excel文件需包含以下Sheet:

1. **成本-其他利益**: 经纪人主数据
2. **成本-积分**: 积分授予/使用记录
3. **成本-社保公积金**: 五险一金明细
4. **Mapping**: 经纪人ID映射

## 目录结构

```
insurance-analytics/
├── backend/           # Flask后端
│   ├── app.py        # 主应用
│   ├── services/     # 业务服务
│   └── models/       # 数据模型
├── frontend/          # React前端
│   ├── src/
│   │   ├── components/  # UI组件
│   │   ├── context/     # 状态管理
│   │   └── utils/       # 工具函数
│   └── package.json
├── data/              # 数据存储
└── docker-compose.yml
```
