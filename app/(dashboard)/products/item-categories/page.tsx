'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Tag } from 'antd';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const { TextArea } = Input;

interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  parentName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ItemCategoriesPage() {
  const { can, loading: permLoading } = usePermissions();
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [form] = Form.useForm();

  useEffect(() => {
    if (!permLoading && can('products', 'view')) {
      fetchCategories();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/products/item-categories');
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (category: ItemCategory) => {
    setEditingCategory(category);
    form.setFieldsValue({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      parentId: category.parentId,
      description: category.description,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/products/item-categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('Xóa danh mục thành công');
        fetchCategories();
      } else {
        message.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const url = editingCategory 
        ? `/api/products/item-categories/${editingCategory.id}` 
        : '/api/products/item-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (data.success) {
        message.success(editingCategory ? 'Cập nhật thành công' : 'Tạo danh mục thành công');
        setShowModal(false);
        fetchCategories();
      } else {
        message.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      // validation error
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(cat => {
    const searchKey = 'search,categoryCode,categoryName';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue || 
      cat.categoryCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      cat.categoryName.toLowerCase().includes(searchValue.toLowerCase());
    
    return matchSearch;
  });

  return (
    <>
      {/* Nút quay lại */}
      <div className="mb-4">
        <Link href="/products/items">
          <Button icon={<ArrowLeftOutlined />} type="default">
            Quay lại Hàng hoá
          </Button>
        </Link>
      </div>

      <WrapperContent<ItemCategory>
        title="Danh mục hàng hoá"
        isNotAccessible={!can('products', 'view')}
        isLoading={permLoading || loading}
        header={{
          buttonEnds: can('products', 'create')
            ? [
                { type: 'default', name: 'Đặt lại', onClick: () => setFilterQueries({}), icon: <ReloadOutlined /> },
                { type: 'primary', name: 'Thêm danh mục', onClick: handleCreate, icon: <PlusOutlined /> },
              ]
            : [{ type: 'default', name: 'Đặt lại', onClick: () => setFilterQueries({}), icon: <ReloadOutlined /> }],
          searchInput: {
            placeholder: 'Tìm theo mã, tên danh mục...',
            filterKeys: ['categoryCode', 'categoryName'],
          },
          filters: {
            fields: [],
            onApplyFilter: (arr) => {
              const newQueries: Record<string, any> = { ...filterQueries };
              arr.forEach(({ key, value }) => { newQueries[key] = value; });
              setFilterQueries(newQueries);
            },
            onReset: () => setFilterQueries({}),
            query: filterQueries,
          },
        }}
      >
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-2">📁</div>
              <div>Chưa có danh mục</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Mã danh mục</th>
                  <th className="px-4 py-3 text-left">Tên danh mục</th>
                  <th className="px-4 py-3 text-left">Danh mục cha</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{category.categoryCode}</td>
                    <td className="px-4 py-3 font-medium">{category.categoryName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {category.parentName || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {category.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Tag color={category.isActive ? 'success' : 'default'}>
                        {category.isActive ? 'Hoạt động' : 'Ngừng'}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {can('products', 'edit') && (
                        <button onClick={() => handleEdit(category)} className="text-blue-600 hover:text-blue-800">
                          <EditOutlined />
                        </button>
                      )}
                      {can('products', 'delete') && (
                        <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(category.id)}>
                          <button className="text-red-600 hover:text-red-800">
                            <DeleteOutlined />
                          </button>
                        </Popconfirm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </WrapperContent>

      <Modal
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="categoryCode" 
            label="Mã danh mục" 
            rules={[{ required: true, message: 'Vui lòng nhập mã' }]}
          >
            <Input placeholder="VD: DM001" disabled={!!editingCategory} />
          </Form.Item>

          <Form.Item 
            name="categoryName" 
            label="Tên danh mục" 
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          <Form.Item name="parentId" label="Danh mục cha">
            <Select 
              placeholder="Chọn danh mục cha (nếu có)" 
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {categories
                .filter(c => !editingCategory || c.id !== editingCategory.id)
                .map(c => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.categoryName} ({c.categoryCode})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
