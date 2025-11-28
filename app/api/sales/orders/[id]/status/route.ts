import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.orders', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền cập nhật đơn hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'WAITING_MATERIAL', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Trạng thái không hợp lệ: ' + status
      }, { status: 400 });
    }

    // Nếu chuyển sang IN_PRODUCTION, khởi tạo production_status
    if (status === 'IN_PRODUCTION') {
      await query(
        `UPDATE orders 
         SET status = $1, 
             production_status = COALESCE(production_status, '{"cutting": false, "sewing": false, "finishing": false, "quality_check": false}'::jsonb),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [status, orderId]
      );
    } else {
      await query(
        `UPDATE orders 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [status, orderId]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật trạng thái thành công'
    });

  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
