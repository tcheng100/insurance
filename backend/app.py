"""
保险经纪人业绩分析系统 - Flask API
"""
import os
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename

from services.excel_parser import ExcelParser
from services.data_store import DataStore
from services.data_matcher import DataMatcher
from services.kpi_calculator import KPICalculator

app = Flask(__name__)
CORS(app)

# 配置
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), '..', 'data', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# 初始化服务
data_store = DataStore(os.path.join(os.path.dirname(__file__), '..', 'data', 'analytics.db'))
excel_parser = ExcelParser()
data_matcher = DataMatcher()
kpi_calculator = KPICalculator(data_store)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'ok', 'message': '服务运行正常'})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """上传Excel文件"""
    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': '不支持的文件格式，请上传xlsx或xls文件'}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # 解析Excel
        parsed_data = excel_parser.parse(filepath)

        # 模糊匹配社保数据
        if parsed_data.get('social_security') and parsed_data.get('agents'):
            matched_ss = data_matcher.match_social_security(
                parsed_data['social_security'],
                parsed_data['agents']
            )
            parsed_data['social_security'] = matched_ss

        # 存储数据
        result = data_store.save_data(parsed_data)

        return jsonify({
            'success': True,
            'message': '文件上传并处理成功',
            'summary': result
        })
    except Exception as e:
        return jsonify({'error': f'处理文件时出错: {str(e)}'}), 500


@app.route('/api/filters', methods=['GET'])
def get_filter_options():
    """获取筛选器选项"""
    try:
        options = data_store.get_filter_options()
        return jsonify(options)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clear-data', methods=['POST'])
def clear_data():
    """清空所有业务数据"""
    try:
        data_store.clear_all_data()
        return jsonify({'success': True, 'message': '数据已清空'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/margin-analysis', methods=['POST'])
def get_margin_analysis():
    """获取边际贡献分析数据"""
    try:
        filters = request.json or {}
        group_by = filters.pop('group_by', 'region')
        cross_group_by = filters.pop('cross_group_by', None)
        year = filters.pop('year', 2024)

        result = kpi_calculator.calculate_margin_analysis(
            filters=filters,
            group_by=group_by,
            cross_group_by=cross_group_by,
            year=year
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/retention-analysis', methods=['POST'])
def get_retention_analysis():
    """获取留存分析数据"""
    try:
        filters = request.json or {}
        group_by = filters.pop('group_by', 'region')

        result = kpi_calculator.calculate_retention_analysis(
            filters=filters,
            group_by=group_by
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/efficiency-trend', methods=['POST'])
def get_efficiency_trend():
    """获取人效走势数据"""
    try:
        filters = request.json or {}
        group_by = filters.pop('group_by', 'region')
        metric = filters.pop('metric', 'avg_fyp')  # avg_fyp, avg_ape, avg_fyc, avg_margin

        result = kpi_calculator.calculate_efficiency_trend(
            filters=filters,
            group_by=group_by,
            metric=metric
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/agent-detail/<int:agent_id>', methods=['GET'])
def get_agent_detail(agent_id):
    """获取经纪人明细"""
    try:
        result = data_store.get_agent_detail(agent_id)
        if result is None:
            return jsonify({'error': '经纪人不存在'}), 404
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/group-agents', methods=['POST'])
def get_group_agents():
    """获取群组内的经纪人列表（下钻功能）"""
    try:
        params = request.json or {}
        group_by = params.get('group_by', 'region')
        group_value = params.get('group_value')
        filters = params.get('filters', {})
        year = params.get('year', 2024)

        result = data_store.get_agents_by_group(
            group_by=group_by,
            group_value=group_value,
            filters=filters,
            year=year
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export', methods=['POST'])
def export_data():
    """导出数据为Excel"""
    try:
        params = request.json or {}
        export_type = params.get('type', 'margin')  # margin, retention, efficiency

        filepath = kpi_calculator.export_to_excel(params, export_type)
        return jsonify({
            'success': True,
            'download_url': f'/api/download/{os.path.basename(filepath)}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file(filename):
    """下载导出的Excel文件"""
    export_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'exports')
    safe_name = secure_filename(filename)
    if not safe_name:
        abort(404)
    return send_from_directory(export_dir, safe_name, as_attachment=True)


@app.route('/api/summary', methods=['GET'])
def get_summary():
    """获取数据概览"""
    try:
        summary = data_store.get_data_summary()
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    app.run(debug=True, port=port)
