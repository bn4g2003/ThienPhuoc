import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('inventory.export', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu xuất kho'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Lấy thông tin phiếu
    const transResult = await query(
      `SELECT 
        it.id,
        it.transaction_code as "transactionCode",
        it.from_warehouse_id as "fromWarehouseId",
        w.warehouse_name as "fromWarehouseName",
        it.status,
        it.notes,
        u1.full_name as "createdBy",
        it.created_at as "createdAt",
        u2.full_name as "approvedBy",
        it.approved_at as "approvedAt",
        it.completed_at as "completedAt"
       FROM inventory_transactions it
       LEFT JOIN warehouses w ON w.id = it.from_warehouse_id
       LEFT JOIN users u1 ON u1.id = it.created_by
       LEFT JOIN users u2 ON u2.id = it.approved_by
       WHERE it.id = $1`,
      [transactionId]
    );

    if (transResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy phiếu xuất'
      }, { status: 404 });
    }

    // Lấy chi tiết
    const detailsResult = await query(
      `SELECT 
        itd.id,
        COALESCE(m.material_code, p.product_code) as "itemCode",
        COALESCE(m.material_name, p.product_name) as "itemName",
        COALESCE(m.unit, p.unit) as unit,
        itd.quantity,
        itd.notes
       FROM inventory_transaction_details itd
       LEFT JOIN materials m ON m.id = itd.material_id
       LEFT JOIN products p ON p.id = itd.product_id
       WHERE itd.transaction_id = $1
       ORDER BY itd.id`,
      [transactionId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...transResult.rows[0],
        details: detailsResult.rows
      }
    });

  } catch (error) {
    console.error('Get export detail error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
