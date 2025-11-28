import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền duyệt phiếu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Kiểm tra phiếu
    const transCheck = await query(
      `SELECT id, status, from_warehouse_id FROM inventory_transactions WHERE id = $1`,
      [transactionId]
    );

    if (transCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy phiếu'
      }, { status: 404 });
    }

    if (transCheck.rows[0].status !== 'PENDING') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Phiếu không ở trạng thái chờ duyệt'
      }, { status: 400 });
    }

    const fromWarehouseId = transCheck.rows[0].from_warehouse_id;

    // Lấy chi tiết
    const details = await query(
      `SELECT product_id, material_id, quantity FROM inventory_transaction_details WHERE transaction_id = $1`,
      [transactionId]
    );

    // Trừ tồn kho
    for (const item of details.rows) {
      const existingBalance = await query(
        `SELECT id, quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
        [fromWarehouseId, item.product_id, item.material_id]
      );

      if (existingBalance.rows.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy tồn kho'
        }, { status: 400 });
      }

      if (existingBalance.rows[0].quantity < item.quantity) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Số lượng tồn kho không đủ'
        }, { status: 400 });
      }

      // Trừ tồn kho
      await query(
        `UPDATE inventory_balances 
         SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [item.quantity, existingBalance.rows[0].id]
      );
    }

    // Cập nhật trạng thái
    await query(
      `UPDATE inventory_transactions 
       SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [currentUser.id, transactionId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Duyệt phiếu xuất kho thành công'
    });

  } catch (error) {
    console.error('Approve export error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
