import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn hàng'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        o.id,
        o.order_code as "orderCode",
        c.customer_name as "customerName",
        o.order_date as "orderDate",
        o.total_amount as "totalAmount",
        o.discount_amount as "discountAmount",
        o.final_amount as "finalAmount",
        o.status,
        u.full_name as "createdBy",
        o.created_at as "createdAt"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u ON u.id = o.created_by
       WHERE o.branch_id = $1
       ORDER BY o.created_at DESC`,
      [currentUser.branchId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// API tạo khách hàng nhanh khi tạo đơn
async function createQuickCustomer(customerData: any, branchId: number) {
  // Tạo mã khách hàng tự động
  const codeResult = await query(
    `SELECT 'KH' || LPAD((COUNT(*) + 1)::TEXT, 6, '0') as code FROM customers`
  );
  const customerCode = codeResult.rows[0].code;

  const result = await query(
    `INSERT INTO customers (customer_code, customer_name, phone, address, branch_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, customer_code as "customerCode", customer_name as "customerName"`,
    [customerCode, customerData.customerName, customerData.phone || null, customerData.address || null, branchId]
  );

  return result.rows[0];
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo đơn hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { customerId, newCustomer, orderDate, items, discountAmount, notes } = body;

    if (!items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Đơn hàng phải có ít nhất 1 hàng hoá'
      }, { status: 400 });
    }

    // Xử lý khách hàng - tạo mới nếu cần
    let finalCustomerId = customerId;
    if (!customerId && newCustomer) {
      if (!newCustomer.customerName) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Vui lòng nhập tên khách hàng'
        }, { status: 400 });
      }
      const createdCustomer = await createQuickCustomer(newCustomer, currentUser.branchId);
      finalCustomerId = createdCustomer.id;
    }

    if (!finalCustomerId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn hoặc tạo khách hàng'
      }, { status: 400 });
    }

    // Tính tổng tiền
    const totalAmount = items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const finalAmount = totalAmount - (discountAmount || 0);

    // Tạo mã đơn hàng
    const codeResult = await query(
      `SELECT 'DH' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || 
       LPAD((COUNT(*) + 1)::TEXT, 4, '0') as code
       FROM orders 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const orderCode = codeResult.rows[0].code;

    // Tạo đơn hàng
    const orderResult = await query(
      `INSERT INTO orders (
        order_code, customer_id, branch_id, order_date,
        total_amount, discount_amount, final_amount,
        notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        orderCode,
        finalCustomerId,
        currentUser.branchId,
        orderDate,
        totalAmount,
        discountAmount || 0,
        finalAmount,
        notes || null,
        currentUser.id
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Thêm chi tiết đơn hàng - sử dụng item_id thay vì product_id
    for (const item of items) {
      await query(
        `INSERT INTO order_details (
          order_id, item_id, product_id, quantity, unit_price, 
          cost_price, total_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orderId,
          item.itemId || null,
          item.productId || null,
          item.quantity,
          item.unitPrice,
          item.costPrice || 0,
          item.quantity * item.unitPrice,
          item.notes || null
        ]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: orderId, orderCode }
    });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
