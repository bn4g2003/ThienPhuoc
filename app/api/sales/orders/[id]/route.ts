import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    // Lấy thông tin đơn hàng
    const orderResult = await query(
      `SELECT 
        o.id,
        o.order_code as "orderCode",
        o.customer_id as "customerId",
        c.customer_name as "customerName",
        o.order_date as "orderDate",
        o.total_amount as "totalAmount",
        o.discount_amount as "discountAmount",
        o.final_amount as "finalAmount",
        o.status,
        COALESCE(o.paid_amount, 0) as "paidAmount",
        COALESCE(o.payment_status, 'UNPAID') as "paymentStatus",
        o.notes,
        u.full_name as "createdBy",
        o.created_at as "createdAt"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u ON u.id = o.created_by
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn hàng'
      }, { status: 404 });
    }

    // Lấy chi tiết hàng hóa (items)
    const detailsResult = await query(
      `SELECT 
        od.id,
        od.item_id as "itemId",
        COALESCE(od.product_id, i.product_id) as "productId",
        i.material_id as "materialId",
        COALESCE(i.item_code, p.product_code) as "itemCode",
        COALESCE(i.item_name, p.product_name) as "itemName",
        od.quantity,
        od.unit_price as "unitPrice",
        od.total_amount as "totalAmount",
        od.notes
       FROM order_details od
       LEFT JOIN items i ON i.id = od.item_id
       LEFT JOIN products p ON p.id = od.product_id
       WHERE od.order_id = $1
       ORDER BY od.id`,
      [orderId]
    );

    const orderData = orderResult.rows[0];

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...orderData,
        details: detailsResult.rows
      }
    });

  } catch (error) {
    console.error('Get order detail error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
