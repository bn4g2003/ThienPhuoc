import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu xuất kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    let whereClause = "WHERE it.transaction_type = 'XUAT'";
    let params: any[] = [];
    let paramIndex = 1;

    // Lọc theo kho cụ thể nếu có
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
      whereClause += ` AND w.branch_id = $${paramIndex}`;
      params.push(currentUser.branchId);
    }

    const result = await query(
      `SELECT 
        it.id,
        it.transaction_code as "transactionCode",
        it.from_warehouse_id as "fromWarehouseId",
        w.warehouse_name as "fromWarehouseName",
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
       LEFT JOIN warehouses w ON w.id = it.from_warehouse_id
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
    console.error('Get export transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// POST - Tạo phiếu xuất kho
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo phiếu xuất kho'
      }, { status: 403 });
    }

    const body = await request.json();
    const { fromWarehouseId, notes, items } = body;

    if (!fromWarehouseId || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Tạo mã phiếu
    const codeResult = await query(
      `SELECT 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
       FROM inventory_transactions 
       WHERE transaction_code LIKE 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
    );
    const transactionCode = codeResult.rows[0].code;

    // Tạo phiếu xuất
    const transResult = await query(
      `INSERT INTO inventory_transactions (transaction_code, transaction_type, from_warehouse_id, status, notes, created_by)
       VALUES ($1, 'XUAT', $2, 'PENDING', $3, $4)
       RETURNING id`,
      [transactionCode, fromWarehouseId, notes, currentUser.id]
    );

    const transactionId = transResult.rows[0].id;

    // Kiểm tra tồn kho trước khi tạo phiếu
    for (const item of items) {
      const existingBalance = await query(
        `SELECT id, quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
        [fromWarehouseId, item.productId || null, item.materialId || null]
      );

      if (existingBalance.rows.length === 0) {
        throw new Error(`Không tìm thấy tồn kho cho mặt hàng này`);
      }

      if (existingBalance.rows[0].quantity < item.quantity) {
        throw new Error(`Số lượng tồn kho không đủ`);
      }
    }

    // Thêm chi tiết (chưa trừ tồn kho)
    for (const item of items) {
      await query(
        `INSERT INTO inventory_transaction_details (transaction_id, product_id, material_id, quantity, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          transactionId,
          item.productId || null,
          item.materialId || null,
          item.quantity,
          item.notes || null
        ]
      );
    }

    // Phiếu ở trạng thái PENDING - chờ duyệt

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: transactionId, transactionCode },
      message: 'Tạo phiếu xuất kho thành công'
    });

  } catch (error) {
    console.error('Create export transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
