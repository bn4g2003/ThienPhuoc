import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { customerName, phone, email, address, customerGroupId, isActive } = body;

    await query(
      `UPDATE customers 
       SET customer_name = $1, phone = $2, email = $3, address = $4,
           customer_group_id = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [customerName, phone || null, email || null, address || null, customerGroupId || null, isActive !== undefined ? isActive : true, customerId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    // Kiểm tra có đơn hàng không
    const checkOrders = await query(
      'SELECT id FROM orders WHERE customer_id = $1 LIMIT 1',
      [customerId]
    );

    if (checkOrders.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa khách hàng đã có đơn hàng'
      }, { status: 400 });
    }

    await query('DELETE FROM customers WHERE id = $1', [customerId]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
