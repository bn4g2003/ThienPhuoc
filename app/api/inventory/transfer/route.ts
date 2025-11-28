import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.transfer', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu chuyển kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    let whereClause = "WHERE it.transaction_type = 'CHUYEN'";
    let params: any[] = [];
    let paramIndex = 1;

    // Lọc theo kho cụ thể nếu có (chuyển từ kho này)
    if (warehouseId) {
      whereClause += ` AND it.from_warehouse_id = $${paramIndex}`;
      params.push(parseInt(warehouseId));
      paramIndex++;
    }

    if (status && status !== 'ALL') {
      whereClause += ` AND it.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause += ` AND (w1.branch_id = $${paramIndex} OR w2.branch_id = $${paramIndex})`;
      params.push(currentUser.branchId);
    }

    const result = await query(
      `SELECT 
        it.id,
        it.transaction_code as "transactionCode",
        it.from_warehouse_id as "fromWarehouseId",
        w1.warehouse_name as "fromWarehouseName",
        it.to_warehouse_id as "toWarehouseId",
        w2.warehouse_name as "toWarehouseName",
        it.status,
        it.notes,
        it.created_by as "createdBy",
        u1.full_name as "createdByName",
        it.created_at as "createdAt",
        it.approved_by as "approvedBy",
        u2.full_name as "approvedByName",
        it.approved_at as "approvedAt",
        COALESCE((SELECT SUM(itd.total_amount) FROM inventory_transaction_details itd WHERE itd.transaction_id = it.id), 0) as "totalAmount"
       FROM inventory_transactions it
       LEFT JOIN warehouses w1 ON w1.id = it.from_warehouse_id
       LEFT JOIN warehouses w2 ON w2.id = it.to_warehouse_id
       LEFT JOIN users u1 ON u1.id = it.created_by
       LEFT JOIN users u2 ON u2.id = it.approved_by
       ${whereClause}
       ORDER BY it.created_at DESC`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get transfer transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
