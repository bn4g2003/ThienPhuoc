'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined, UserAddOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

interface Order {
  id: number;
  orderCode: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  finalAmount: number;
  status: string;
  createdBy: string;
}

interface Item {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: string;
  unit: string;
  costPrice: number;
}

export default function OrdersPage() {
  const { can, loading: permLoading } = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMaterialSuggestion, setShowMaterialSuggestion] = useState(false);
  const [materialSuggestion, setMaterialSuggestion] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  // State cho thêm khách hàng mới
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ customerName: '', phone: '', address: '' });

  useEffect(() => {
    if (!permLoading && can('sales.orders', 'view')) {
      fetchOrders();
      fetchCustomers();
      fetchProducts();
      fetchItems();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/sales/customers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomers(data.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error(error);
      setCustomers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.data && Array.isArray(data.data.products)) {
        setProducts(data.data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Fetch products error:', error);
      setProducts([]);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/products/items');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Fetch items error:', error);
      setItems([]);
    }
  };

  const handleCreateOrder = () => {
    setOrderForm({
      customerId: '',
      orderDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setOrderItems([]);
    setSelectedCustomer(null);
    setShowNewCustomer(false);
    setNewCustomer({ customerName: '', phone: '', address: '' });
    setShowCreateModal(true);
  };

  const handleCustomerChange = (customerId: string) => {
    if (customerId === 'NEW') {
      setShowNewCustomer(true);
      setSelectedCustomer(null);
      setOrderForm({ ...orderForm, customerId: '' });
      return;
    }
    
    setShowNewCustomer(false);
    const customer = Array.isArray(customers) ? customers.find(c => c.id === parseInt(customerId)) : null;
    setSelectedCustomer(customer);
    setOrderForm({ ...orderForm, customerId });
    
    // Cập nhật giá cho các items đã có
    if (customer && orderItems.length > 0 && Array.isArray(items)) {
      const updatedItems = orderItems.map(item => {
        const foundItem = items.find(i => i.id === item.itemId);
        if (foundItem) {
          const basePrice = foundItem.costPrice || 0;
          const discountPercent = customer.priceMultiplier || 0;
          const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));
          return { ...item, unitPrice, totalAmount: item.quantity * unitPrice };
        }
        return item;
      });
      setOrderItems(updatedItems);
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      itemId: '',
      itemName: '',
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      costPrice: 0,
      totalAmount: 0,
      notes: '',
    }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];
    
    if (field === 'itemId') {
      // Sử dụng items (hàng hoá) thay vì products
      const item = Array.isArray(items) ? items.find(i => i.id === parseInt(value)) : null;
      if (item) {
        const basePrice = item.costPrice || 0;
        const discountPercent = selectedCustomer?.priceMultiplier || 0;
        const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));
        
        newItems[index] = {
          ...newItems[index],
          itemId: item.id,
          itemName: item.itemName,
          unitPrice,
          costPrice: basePrice,
          totalAmount: newItems[index].quantity * unitPrice,
        };
      }
    } else if (field === 'productId') {
      // Giữ lại để tương thích ngược
      const product = Array.isArray(products) ? products.find(p => p.id === parseInt(value)) : null;
      if (product) {
        const basePrice = product.costPrice || 0;
        const discountPercent = selectedCustomer?.priceMultiplier || 0;
        const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));
        
        newItems[index] = {
          ...newItems[index],
          productId: product.id,
          productName: product.productName,
          unitPrice,
          costPrice: basePrice,
          totalAmount: newItems[index].quantity * unitPrice,
        };
      }
    } else if (field === 'quantity') {
      const qty = parseInt(value) || 0;
      newItems[index].quantity = qty;
      newItems[index].totalAmount = qty * newItems[index].unitPrice;
    } else if (field === 'unitPrice') {
      const price = parseFloat(value) || 0;
      newItems[index].unitPrice = price;
      newItems[index].totalAmount = newItems[index].quantity * price;
    } else {
      newItems[index][field] = value;
    }
    
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kiểm tra khách hàng - có thể là khách hàng mới hoặc đã có
    if (!orderForm.customerId && !showNewCustomer) {
      alert('Vui lòng chọn khách hàng hoặc thêm khách hàng mới');
      return;
    }
    
    if (showNewCustomer && !newCustomer.customerName) {
      alert('Vui lòng nhập tên khách hàng mới');
      return;
    }
    
    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất 1 hàng hoá');
      return;
    }
    
    // Kiểm tra items - ưu tiên itemId, fallback productId
    if (orderItems.some(item => (!item.itemId && !item.productId) || item.quantity <= 0)) {
      alert('Vui lòng kiểm tra thông tin hàng hoá');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: orderForm.customerId ? parseInt(orderForm.customerId) : null,
          newCustomer: showNewCustomer ? newCustomer : null,
          orderDate: orderForm.orderDate,
          notes: orderForm.notes,
          discountAmount: 0,
          items: orderItems.map(item => ({
            itemId: item.itemId || null,
            productId: item.productId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            notes: item.notes,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Tạo đơn hàng thành công! Mã đơn: ${data.data.orderCode}`);
        setShowCreateModal(false);
        fetchOrders();
        fetchCustomers(); // Refresh danh sách khách hàng nếu có thêm mới
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/sales/orders');
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/sales/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
        setShowDetail(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: any = {
      'PENDING': 'Chờ xác nhận',
      'CONFIRMED': 'Đã xác nhận',
      'WAITING_MATERIAL': 'Chờ nguyên liệu',
      'IN_PRODUCTION': 'Đang sản xuất',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/sales/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Cập nhật thành công');
        fetchOrders();
        if (showDetail) viewDetail(id);
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const updateProductionStep = async (orderId: number, step: string) => {
    try {
      const res = await fetch(`/api/sales/orders/${orderId}/production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      });

      const data = await res.json();
      if (data.success) {
        viewDetail(orderId);
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const loadMaterialSuggestion = async (orderId: number) => {
    try {
      const res = await fetch(`/api/sales/orders/${orderId}/material-suggestion`);
      const data = await res.json();
      console.log('Material suggestion response:', data);
      if (data.success) {
        console.log('Warehouses:', data.data.warehouses);
        console.log('Materials:', data.data.materials);
        setMaterialSuggestion(data.data);
        setShowMaterialSuggestion(true);
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Load material suggestion error:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const createImportSuggestion = () => {
    if (!selectedWarehouse) {
      alert('Vui lòng chọn kho nhập');
      return;
    }

    const materialsToImport = materialSuggestion.materials.filter((m: any) => m.needToImport > 0);
    
    if (materialsToImport.length === 0) {
      alert('Không có nguyên liệu nào cần nhập');
      return;
    }

    // Chuyển đến trang tạo phiếu nhập với dữ liệu gợi ý
    const suggestionData = {
      warehouseId: selectedWarehouse,
      materials: materialsToImport.map((m: any) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        quantity: m.needToImport,
        unit: m.unit
      }))
    };

    localStorage.setItem('importSuggestion', JSON.stringify(suggestionData));
    window.location.href = '/inventory?tab=import';
  };

  // Apply filters
  const filteredOrders = orders.filter(o => {
    // Search filter
    const searchKey = 'search,orderCode,customerName';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue || 
      o.orderCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchValue.toLowerCase());
    
    // Status filter
    const statusValue = filterQueries['status'];
    const matchStatus = !statusValue || o.status === statusValue;
    
    return matchSearch && matchStatus;
  });

  const handleExportExcel = () => {
    alert('Chức năng xuất Excel đang được phát triển');
  };

  const handleImportExcel = () => {
    alert('Chức năng nhập Excel đang được phát triển');
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setSearchTerm('');
    setFilterStatus('ALL');
  };

  return (
    <>
      <WrapperContent<Order>
        title="Quản lý đơn hàng"
        isNotAccessible={!can('sales.orders', 'view')}
        isLoading={permLoading || loading}
        header={{
          buttonEnds: can('sales.orders', 'create')
            ? [
                {
                  type: 'default',
                  name: 'Đặt lại',
                  onClick: handleResetAll,
                  icon: <ReloadOutlined />,
                },
                {
                  type: 'primary',
                  name: 'Thêm',
                  onClick: handleCreateOrder,
                  icon: <PlusOutlined />,
                },
                {
                  type: 'default',
                  name: 'Xuất Excel',
                  onClick: handleExportExcel,
                  icon: <DownloadOutlined />,
                },
                {
                  type: 'default',
                  name: 'Nhập Excel',
                  onClick: handleImportExcel,
                  icon: <UploadOutlined />,
                },
              ]
            : [
                {
                  type: 'default',
                  name: 'Đặt lại',
                  onClick: handleResetAll,
                  icon: <ReloadOutlined />,
                },
              ],
          searchInput: {
            placeholder: 'Tìm theo mã đơn, khách hàng...',
            filterKeys: ['orderCode', 'customerName'],
          },
          filters: {
            fields: [
              {
                type: 'select',
                name: 'status',
                label: 'Trạng thái',
                options: [
                  { label: 'Chờ xác nhận', value: 'PENDING' },
                  { label: 'Đã xác nhận', value: 'CONFIRMED' },
                  { label: 'Chờ nguyên liệu', value: 'WAITING_MATERIAL' },
                  { label: 'Đang sản xuất', value: 'IN_PRODUCTION' },
                  { label: 'Hoàn thành', value: 'COMPLETED' },
                  { label: 'Đã hủy', value: 'CANCELLED' },
                ],
              },
            ],
            onApplyFilter: (arr) => {
              const newQueries: Record<string, any> = { ...filterQueries };
              arr.forEach(({ key, value }) => {
                newQueries[key] = value;
              });
              setFilterQueries(newQueries);
            },
            onReset: () => {
              setFilterQueries({});
              setSearchTerm('');
              setFilterStatus('ALL');
            },
            query: filterQueries,
          },
        }}
      >
        <div className="flex gap-4">
          <div className={`space-y-4 transition-all duration-300 ${showDetail ? 'w-1/2' : 'w-full'}`}>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-2">📋</div>
                  <div>Chưa có đơn hàng</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left w-32">Mã đơn</th>
                      <th className="px-4 py-3 text-left w-48">Khách hàng</th>
                      <th className="px-4 py-3 text-left w-32">Ngày đặt</th>
                      <th className="px-4 py-3 text-right w-36">Tổng tiền</th>
                      <th className="px-4 py-3 text-left w-40">Trạng thái</th>
                      <th className="px-4 py-3 text-right w-32">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                      <tr 
                        key={order.id}
                        onClick={() => viewDetail(order.id)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono">{order.orderCode}</td>
                        <td className="px-4 py-3">{order.customerName}</td>
                        <td className="px-4 py-3">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right font-semibold">{order.finalAmount.toLocaleString()} đ</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {order.status === 'PENDING' && can('sales.orders', 'edit') && (
                            <button
                              onClick={() => updateStatus(order.id, 'CONFIRMED')}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              ✓ Xác nhận
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {showDetail && selectedOrder && (
        <div className="w-1/2 bg-white border-l shadow-xl overflow-y-auto fixed right-0 top-0 h-screen z-40">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <h3 className="text-xl font-bold">Chi tiết đơn hàng</h3>
            <button onClick={() => setShowDetail(false)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
          </div>

          <div className="p-6 space-y-6">
            {/* Thông tin đơn hàng */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Mã đơn:</span> <span className="font-mono font-medium">{selectedOrder.orderCode}</span></div>
                <div><span className="text-gray-600">Trạng thái:</span> <span className={`px-2 py-1 rounded text-xs ${
                  selectedOrder.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  selectedOrder.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                  selectedOrder.status === 'WAITING_MATERIAL' ? 'bg-orange-100 text-orange-800' :
                  selectedOrder.status === 'IN_PRODUCTION' ? 'bg-purple-100 text-purple-800' :
                  selectedOrder.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>{getStatusText(selectedOrder.status)}</span></div>
                <div><span className="text-gray-600">Khách hàng:</span> {selectedOrder.customerName}</div>
                <div><span className="text-gray-600">Ngày đặt:</span> {new Date(selectedOrder.orderDate).toLocaleDateString('vi-VN')}</div>
                <div><span className="text-gray-600">Người tạo:</span> {selectedOrder.createdBy}</div>
              </div>
              {selectedOrder.notes && (
                <div className="mt-3 text-sm"><span className="text-gray-600">Ghi chú:</span> {selectedOrder.notes}</div>
              )}
            </div>

            {/* Tiến trình đơn hàng */}
            {selectedOrder.status !== 'CANCELLED' && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold mb-4">Tiến trình đơn hàng</h4>
                <div className="space-y-3">
                  {/* Bước 1: Chờ xác nhận */}
                  <div className={`flex items-start gap-3 ${selectedOrder.status === 'PENDING' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedOrder.status === 'PENDING' ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>1</div>
                    <div className="flex-1">
                      <div className="font-medium">Chờ xác nhận</div>
                      <div className="text-xs text-gray-500">Đơn hàng đang chờ xác nhận từ quản lý</div>
                    </div>
                  </div>

                  {/* Bước 2: Đã xác nhận */}
                  <div className={`flex items-start gap-3 ${['CONFIRMED', 'WAITING_MATERIAL', 'IN_PRODUCTION', 'COMPLETED'].includes(selectedOrder.status) ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      ['CONFIRMED', 'WAITING_MATERIAL', 'IN_PRODUCTION', 'COMPLETED'].includes(selectedOrder.status) ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>2</div>
                    <div className="flex-1">
                      <div className="font-medium">Đã xác nhận</div>
                      <div className="text-xs text-gray-500">Đơn hàng đã được xác nhận</div>
                    </div>
                  </div>

                  {/* Bước 3: Chờ nguyên liệu */}
                  <div className={`flex items-start gap-3 ${selectedOrder.status === 'WAITING_MATERIAL' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedOrder.status === 'WAITING_MATERIAL' ? 'bg-orange-500 text-white' : 
                      ['IN_PRODUCTION', 'COMPLETED'].includes(selectedOrder.status) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>3</div>
                    <div className="flex-1">
                      <div className="font-medium">Chờ nguyên liệu</div>
                      <div className="text-xs text-gray-500">Kiểm tra và chuẩn bị nguyên liệu</div>
                      {selectedOrder.status === 'WAITING_MATERIAL' && can('sales.orders', 'edit') && (
                        <div className="mt-2 space-x-2">
                          <button
                            onClick={() => loadMaterialSuggestion(selectedOrder.id)}
                            className="text-xs px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                          >
                            📋 Gợi ý nhập hàng
                          </button>
                          <button
                            onClick={() => updateStatus(selectedOrder.id, 'IN_PRODUCTION')}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            ✓ Bỏ qua - Bắt đầu SX
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bước 4: Sản xuất */}
                  <div className={`flex items-start gap-3 ${selectedOrder.status === 'IN_PRODUCTION' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedOrder.status === 'IN_PRODUCTION' ? 'bg-purple-500 text-white' : 
                      selectedOrder.status === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>4</div>
                    <div className="flex-1">
                      <div className="font-medium">Sản xuất</div>
                      <div className="text-xs text-gray-500 mb-2">Quy trình: Cắt → May → Hoàn thiện → Kiểm định</div>
                      {selectedOrder.status === 'IN_PRODUCTION' && selectedOrder.production && can('sales.orders', 'edit') && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedOrder.production.cutting || false}
                              onChange={() => updateProductionStep(selectedOrder.id, 'cutting')}
                              className="rounded"
                            />
                            <span className={selectedOrder.production.cutting ? 'line-through text-gray-500' : ''}>Cắt</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedOrder.production.sewing || false}
                              onChange={() => updateProductionStep(selectedOrder.id, 'sewing')}
                              className="rounded"
                            />
                            <span className={selectedOrder.production.sewing ? 'line-through text-gray-500' : ''}>May</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedOrder.production.finishing || false}
                              onChange={() => updateProductionStep(selectedOrder.id, 'finishing')}
                              className="rounded"
                            />
                            <span className={selectedOrder.production.finishing ? 'line-through text-gray-500' : ''}>Hoàn thiện</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedOrder.production.quality_check || false}
                              onChange={() => updateProductionStep(selectedOrder.id, 'quality_check')}
                              className="rounded"
                            />
                            <span className={selectedOrder.production.quality_check ? 'line-through text-gray-500' : ''}>Kiểm định</span>
                          </div>
                          {selectedOrder.production.cutting && selectedOrder.production.sewing && 
                           selectedOrder.production.finishing && selectedOrder.production.quality_check && (
                            <button
                              onClick={() => updateStatus(selectedOrder.id, 'COMPLETED')}
                              className="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              ✓ Hoàn thành đơn hàng
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bước 5: Hoàn thành */}
                  <div className={`flex items-start gap-3 ${selectedOrder.status === 'COMPLETED' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedOrder.status === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>5</div>
                    <div className="flex-1">
                      <div className="font-medium">Hoàn thành</div>
                      <div className="text-xs text-gray-500">Đơn hàng đã hoàn thành</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Danh sách sản phẩm */}
            <div>
              <h4 className="font-semibold mb-3">Danh sách sản phẩm</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">STT</th>
                    <th className="px-3 py-2 text-left">Sản phẩm</th>
                    <th className="px-3 py-2 text-right">SL</th>
                    <th className="px-3 py-2 text-right">Đơn giá</th>
                    <th className="px-3 py-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedOrder.details?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{item.unitPrice.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold">{item.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 space-y-2 text-right">
                <div>Tổng tiền: <span className="font-semibold">{selectedOrder.totalAmount.toLocaleString()} đ</span></div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="text-red-600">Giảm giá: -{selectedOrder.discountAmount.toLocaleString()} đ</div>
                )}
                <div className="text-lg font-bold text-blue-600">
                  Thành tiền: {selectedOrder.finalAmount.toLocaleString()} đ
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4">
              <button
                onClick={() => window.open(`/api/sales/orders/${selectedOrder.id}/pdf`, '_blank')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                🖨️ In PDF
              </button>
              {selectedOrder.status === 'PENDING' && can('sales.orders', 'edit') && (
                <>
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'CANCELLED')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    ✗ Hủy đơn
                  </button>
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'CONFIRMED')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    ✓ Xác nhận đơn
                  </button>
                </>
              )}
              {selectedOrder.status === 'CONFIRMED' && can('sales.orders', 'edit') && (
                <>
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'WAITING_MATERIAL')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    → Chờ nguyên liệu
                  </button>
                  <button
                    onClick={() => updateStatus(selectedOrder.id, 'IN_PRODUCTION')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    → Bắt đầu SX
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Tạo đơn hàng mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Khách hàng *</label>
                  <select
                    value={showNewCustomer ? 'NEW' : orderForm.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    <option value="NEW" className="text-blue-600 font-medium">➕ Thêm khách hàng mới</option>
                    {Array.isArray(customers) && customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.customerName} {c.groupName ? `(${c.groupName})` : ''}
                      </option>
                    ))}
                  </select>
                  
                  {/* Form thêm khách hàng mới */}
                  {showNewCustomer && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <UserAddOutlined className="text-blue-600" />
                        <span className="font-medium text-blue-800">Thêm khách hàng mới</span>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Tên khách hàng *"
                          value={newCustomer.customerName}
                          onChange={(e) => setNewCustomer({ ...newCustomer, customerName: e.target.value })}
                          className="w-full px-3 py-2 border rounded text-sm"
                          required={showNewCustomer}
                        />
                        <input
                          type="text"
                          placeholder="Số điện thoại"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Địa chỉ"
                          value={newCustomer.address}
                          onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                      </div>
                    </div>
                  )}
                  
                  {selectedCustomer && (
                    <p className="text-xs text-gray-600 mt-1">
                      Giảm giá: {selectedCustomer.priceMultiplier || 0}%
                      {selectedCustomer.priceMultiplier > 0 && (
                        <span className="text-green-600 ml-1">
                          (Giá = Giá gốc × {100 - selectedCustomer.priceMultiplier}%)
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày đặt *</label>
                  <input
                    type="date"
                    value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Danh sách hàng hoá *</label>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    ➕ Thêm hàng hoá
                  </button>
                </div>

                {orderItems.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded text-gray-500">
                    Chưa có hàng hoá. {items.length === 0 && <span className="text-orange-600">Vui lòng tạo hàng hoá trong mục "Sản phẩm → Hàng hoá" trước.</span>}
                  </div>
                ) : (
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left">STT</th>
                          <th className="px-2 py-2 text-left">Hàng hoá</th>
                          <th className="px-2 py-2 text-right">Giá gốc</th>
                          <th className="px-2 py-2 text-right">SL</th>
                          <th className="px-2 py-2 text-right">Đơn giá</th>
                          <th className="px-2 py-2 text-right">Thành tiền</th>
                          <th className="px-2 py-2 text-left">Ghi chú</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orderItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-2">{idx + 1}</td>
                            <td className="px-2 py-2">
                              <select
                                value={item.itemId || item.productId}
                                onChange={(e) => updateOrderItem(idx, items.length > 0 ? 'itemId' : 'productId', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              >
                                <option value="">-- Chọn hàng hoá --</option>
                                {items.length > 0 ? (
                                  items.map(i => (
                                    <option key={i.id} value={i.id}>
                                      {i.itemName} ({i.itemCode}) - {i.itemType === 'PRODUCT' ? 'SP' : 'NVL'}
                                    </option>
                                  ))
                                ) : (
                                  products.map(p => (
                                    <option key={p.id} value={p.id}>{p.productName}</option>
                                  ))
                                )}
                              </select>
                            </td>
                            <td className="px-2 py-2 text-right text-gray-500 text-xs">
                              {item.costPrice > 0 ? item.costPrice.toLocaleString() : '-'}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateOrderItem(idx, 'quantity', e.target.value)}
                                className="w-16 px-2 py-1 border rounded text-right"
                                min="1"
                                required
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateOrderItem(idx, 'unitPrice', e.target.value)}
                                className="w-24 px-2 py-1 border rounded text-right"
                                min="0"
                                required
                              />
                            </td>
                            <td className="px-2 py-2 text-right font-semibold">
                              {item.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => updateOrderItem(idx, 'notes', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                                placeholder="Ghi chú..."
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removeOrderItem(idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Tổng tiền:</span>
                  <span className="font-bold text-blue-600 text-xl">
                    {calculateTotal().toLocaleString()} đ
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting || orderItems.length === 0}
                >
                  {submitting ? 'Đang xử lý...' : '✓ Tạo đơn hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Suggestion Modal */}
      {showMaterialSuggestion && materialSuggestion && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Gợi ý nhập nguyên liệu</h2>
              <button onClick={() => setShowMaterialSuggestion(false)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
              <p className="font-medium mb-1">📊 Phân tích nhu cầu nguyên liệu</p>
              <p className="text-gray-600">Dựa trên BOM của sản phẩm và tồn kho hiện tại</p>
            </div>

            {materialSuggestion.warehouses && materialSuggestion.warehouses.length > 0 ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Chọn kho nhập:</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- Chọn kho --</option>
                  {materialSuggestion.warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseName} ({w.warehouseCode})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <p className="font-medium text-yellow-800">⚠️ Chưa có kho nào</p>
                <p className="text-yellow-700 mt-1">Vui lòng tạo kho trong mục "Quản lý kho" trước khi sử dụng tính năng này.</p>
              </div>
            )}

            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã NVL</th>
                    <th className="px-3 py-2 text-left">Tên nguyên liệu</th>
                    <th className="px-3 py-2 text-right">Cần dùng</th>
                    <th className="px-3 py-2 text-right">Tồn kho</th>
                    <th className="px-3 py-2 text-right">Cần nhập</th>
                    <th className="px-3 py-2 text-left">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {materialSuggestion.materials?.map((material: any, idx: number) => (
                    <tr key={idx} className={material.needToImport > 0 ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 font-mono">{material.materialCode}</td>
                      <td className="px-3 py-2">{material.materialName}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {material.totalNeeded.toFixed(2)} {material.unit}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={material.currentStock >= material.totalNeeded ? 'text-green-600' : 'text-orange-600'}>
                          {material.currentStock.toFixed(2)} {material.unit}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {material.needToImport > 0 ? (
                          <span className="font-bold text-red-600">
                            {material.needToImport.toFixed(2)} {material.unit}
                          </span>
                        ) : (
                          <span className="text-green-600">✓ Đủ</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <details className="text-xs text-gray-600">
                          <summary className="cursor-pointer hover:text-blue-600">Xem chi tiết</summary>
                          <ul className="mt-1 ml-4 list-disc">
                            {material.products?.map((p: any, i: number) => (
                              <li key={i}>
                                {p.productName}: {p.quantity} sp × {p.materialPerProduct} {material.unit}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowMaterialSuggestion(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Đóng
              </button>
              {materialSuggestion.warehouses && materialSuggestion.warehouses.length > 0 && (
                <button
                  onClick={createImportSuggestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={!selectedWarehouse}
                >
                  📋 Tạo phiếu nhập từ gợi ý
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </WrapperContent>
    </>
  );
}