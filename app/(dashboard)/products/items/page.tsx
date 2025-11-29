'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { AppstoreOutlined, DeleteOutlined, EditOutlined, InboxOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Tag } from 'antd';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Item {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: 'PRODUCT' | 'MATERIAL';
  productId?: number;
  materialId?: number;
  categoryId?: number;
  categoryName?: string;
  unit: string;
  costPrice: number;
  isActive: boolean;
  sourceName?: string;
  sourceCode?: string;
}

interface Product {
  id: number;
  productCode: string;
  productName: string;
  unit: string;
  costPrice: number;
}

interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  unit: string;
}

interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
}

export default function ItemsPage() {
  const { can, loading: permLoading } = usePermissions();
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [form] = Form.useForm();

  useEffect(() => {
    if (!permLoading && can('products', 'view')) {
      fetchItems();
      fetchProducts();
      fetchMaterials();
      fetchCategories();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/products/items');
      const data = await res.json();
      if (data.success) setItems(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.data?.products) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/products/materials');
      const data = await res.json();
      if (data.success) setMaterials(data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/products/item-categories');
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    form.setFieldsValue({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemType: item.itemType,
      productId: item.productId,
      materialId: item.materialId,
      categoryId: item.categoryId,
      unit: item.unit,
      costPrice: item.costPrice,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/products/items/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('Xóa hàng hoá thành công');
        fetchItems();
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
      const url = editingItem 
        ? `/api/products/items/${editingItem.id}` 
        : '/api/products/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (data.success) {
        message.success(editingItem ? 'Cập nhật thành công' : 'Tạo hàng hoá thành công');
        setShowModal(false);
        fetchItems();
      } else {
        message.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      // validation error
    }
  };

  const handleItemTypeChange = (type: string) => {
    form.setFieldsValue({ productId: undefined, materialId: undefined, unit: '', costPrice: 0 });
  };

  const handleSourceChange = (value: number, type: string) => {
    if (type === 'PRODUCT') {
      const product = products.find(p => p.id === value);
      if (product) {
        form.setFieldsValue({ unit: product.unit, costPrice: product.costPrice || 0 });
      }
    } else {
      const material = materials.find(m => m.id === value);
      if (material) {
        form.setFieldsValue({ unit: material.unit });
      }
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const searchKey = 'search,itemCode,itemName';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue || 
      item.itemCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchValue.toLowerCase());
    
    const typeValue = filterQueries['itemType'];
    const matchType = !typeValue || item.itemType === typeValue;
    
    return matchSearch && matchType;
  });

  return (
    <>
      {/* Các nút điều hướng nhanh */}
      <div className="mb-4">
        <Space size="middle">
          {/* <Link href="/products/item-categories">
            <Button icon={<TagsOutlined />} type="default">
              Danh mục hàng hoá
            </Button>
          </Link> */}
          <Link href="/products/categories">
            <Button icon={<AppstoreOutlined />} type="default">
              Danh mục sản phẩm
            </Button>
          </Link>
          <Link href="/products">
            <Button icon={<AppstoreOutlined />} type="default">
              Sản phẩm
            </Button>
          </Link>
          <Link href="/products/materials">
            <Button icon={<InboxOutlined />} type="default">
              Nguyên vật liệu
            </Button>
          </Link>
        </Space>
      </div>

      <WrapperContent<Item>
        title="Quản lý hàng hoá"
        isNotAccessible={!can('products', 'view')}
        isLoading={permLoading || loading}
        header={{
          buttonEnds: can('products', 'create')
            ? [
                { type: 'default', name: 'Đặt lại', onClick: () => setFilterQueries({}), icon: <ReloadOutlined /> },
                { type: 'primary', name: 'Thêm hàng hoá', onClick: handleCreate, icon: <PlusOutlined /> },
              ]
            : [{ type: 'default', name: 'Đặt lại', onClick: () => setFilterQueries({}), icon: <ReloadOutlined /> }],
          searchInput: {
            placeholder: 'Tìm theo mã, tên hàng hoá...',
            filterKeys: ['itemCode', 'itemName'],
          },
          filters: {
            fields: [
              {
                type: 'select',
                name: 'itemType',
                label: 'Loại hàng',
                options: [
                  { label: 'Sản phẩm', value: 'PRODUCT' },
                  { label: 'Nguyên vật liệu', value: 'MATERIAL' },
                ],
              },
            ],
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
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-2">📦</div>
              <div>Chưa có hàng hoá</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Mã hàng</th>
                  <th className="px-4 py-3 text-left">Tên hàng hoá</th>
                  <th className="px-4 py-3 text-left">Danh mục</th>
                  <th className="px-4 py-3 text-left">Loại</th>
                  <th className="px-4 py-3 text-left">Nguồn</th>
                  <th className="px-4 py-3 text-left">ĐVT</th>
                  <th className="px-4 py-3 text-right">Giá bán</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{item.itemCode}</td>
                    <td className="px-4 py-3 font-medium">{item.itemName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.categoryName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Tag color={item.itemType === 'PRODUCT' ? 'blue' : 'green'}>
                        {item.itemType === 'PRODUCT' ? 'Sản phẩm' : 'NVL'}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.sourceName} ({item.sourceCode})
                    </td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.costPrice?.toLocaleString() || 0} đ
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Tag color={item.isActive ? 'success' : 'default'}>
                        {item.isActive ? 'Hoạt động' : 'Ngừng'}
                      </Tag>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {can('products', 'edit') && (
                        <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">
                          <EditOutlined />
                        </button>
                      )}
                      {can('products', 'delete') && (
                        <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(item.id)}>
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
        title={editingItem ? 'Sửa hàng hoá' : 'Thêm hàng hoá'}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="itemCode" label="Mã hàng hoá" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
            <Input placeholder="VD: HH001" disabled={!!editingItem} />
          </Form.Item>

          <Form.Item name="itemName" label="Tên hàng hoá" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="Nhập tên hàng hoá" />
          </Form.Item>

          <Form.Item name="categoryId" label="Danh mục">
            <Select 
              placeholder="Chọn danh mục (tùy chọn)" 
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.categoryName} ({c.categoryCode})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="itemType" label="Loại hàng" rules={[{ required: true, message: 'Vui lòng chọn loại' }]}>
            <Select placeholder="Chọn loại" onChange={handleItemTypeChange} disabled={!!editingItem}>
              <Select.Option value="PRODUCT">Sản phẩm</Select.Option>
              <Select.Option value="MATERIAL">Nguyên vật liệu</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.itemType !== cur.itemType}>
            {({ getFieldValue }) => {
              const itemType = getFieldValue('itemType');
              if (itemType === 'PRODUCT') {
                return (
                  <Form.Item name="productId" label="Chọn sản phẩm" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                    <Select 
                      placeholder="Chọn sản phẩm" 
                      showSearch 
                      optionFilterProp="children"
                      onChange={(v) => handleSourceChange(v, 'PRODUCT')}
                      disabled={!!editingItem}
                    >
                      {products.map(p => (
                        <Select.Option key={p.id} value={p.id}>
                          {p.productName} ({p.productCode})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (itemType === 'MATERIAL') {
                return (
                  <Form.Item name="materialId" label="Chọn NVL" rules={[{ required: true, message: 'Vui lòng chọn' }]}>
                    <Select 
                      placeholder="Chọn nguyên vật liệu" 
                      showSearch 
                      optionFilterProp="children"
                      onChange={(v) => handleSourceChange(v, 'MATERIAL')}
                      disabled={!!editingItem}
                    >
                      {materials.map(m => (
                        <Select.Option key={m.id} value={m.id}>
                          {m.materialName} ({m.materialCode})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Vui lòng nhập ĐVT' }]}>
            <Input placeholder="VD: Cái, Mét, Kg..." />
          </Form.Item>

          <Form.Item name="costPrice" label="Giá bán">
            <InputNumber 
              style={{ width: '100%' }} 
              min={0} 
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="Nhập giá bán"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
