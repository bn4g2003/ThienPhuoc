import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy tồn kho thành phẩm theo warehouse
export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem tồn kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    // Data segregation - Kiểm tra quyền truy cập kho
    let additionalWhere = '';
    let params: any[] = [warehouseId];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      // User chỉ xem được sản phẩm thuộc chi nhánh của mình
      additionalWhere = ' AND p.branch_id = $2';
      params.push(currentUser.branchId);
    }

    // LEFT JOIN để hiển thị tất cả sản phẩm, kể cả chưa có trong inventory_balances
    const result = await query(
      `SELECT 
        p.id,
        p.product_code as "itemCode",
        p.product_name as "itemName",
        CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
        p.unit
       FROM products p
       LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = $1
       WHERE p.is_active = true${additionalWhere}
       ORDER BY p.product_name`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get inventory products error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
