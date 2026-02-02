import React, { useState } from 'react';
import { Upload, Button, message, Card, Alert, Descriptions, Modal, Space } from 'antd';
import { UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { uploadFile, clearData } from '../../utils/api';
import type { UploadResult } from '../../types';
import { useFilters } from '../../context/FilterContext';

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { refreshOptions } = useFilters();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setResult(null);

    try {
      const res = await uploadFile(file);
      setResult(res);
      message.success('文件上传成功！');
      // 刷新筛选器选项
      await refreshOptions();
      // 刷新数据概览
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: file => {
      handleUpload(file);
      return false;
    },
  };

  return (
    <Card title="数据导入" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Space size={12}>
          <Upload {...uploadProps}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
              size="large"
            >
              {uploading ? '上传中...' : '上传Excel文件'}
            </Button>
          </Upload>
          <Button
            danger
            size="large"
            onClick={() => {
              Modal.confirm({
                title: '确认清空数据？',
                content: '此操作将删除所有导入的数据（不可恢复）。',
                okText: '清空',
                okType: 'danger',
                cancelText: '取消',
                onOk: async () => {
                  try {
                    await clearData();
                    setResult(null);
                    message.success('数据已清空');
                    await refreshOptions();
                    if (onUploadSuccess) {
                      onUploadSuccess();
                    }
                  } catch (error: any) {
                    message.error(error.response?.data?.error || '清空失败，请重试');
                  }
                },
              });
            }}
          >
            清空数据库
          </Button>
        </Space>
        <span style={{ marginLeft: 12, color: '#666' }}>
          <FileExcelOutlined /> 支持 .xlsx, .xls 格式
        </span>
      </div>

      {result && result.success && (
        <Alert
          type="success"
          message="数据导入成功"
          description={
            <Descriptions size="small" column={2} style={{ marginTop: 8 }}>
              <Descriptions.Item label="经纪人数据">
                {result.summary.agents_inserted} 条
              </Descriptions.Item>
              <Descriptions.Item label="积分记录">
                {result.summary.points_inserted} 条
              </Descriptions.Item>
              <Descriptions.Item label="社保记录">
                {result.summary.social_security_inserted} 条
              </Descriptions.Item>
              <Descriptions.Item label="ID映射">
                {result.summary.mapping_inserted} 条
              </Descriptions.Item>
            </Descriptions>
          }
          showIcon
        />
      )}
    </Card>
  );
};

export default FileUpload;
