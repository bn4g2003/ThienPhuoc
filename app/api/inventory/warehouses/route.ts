import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET() {
  try {
    // Kiểm tra quyền xem tồn kho
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem kho'
      }, { status: 403 });
    }

    // Data segregation - Admin xem tất cả, user chỉ xem kho thuộc chi nhánh
    let whereClause = 'WHERE w.is_active = true';
    let params: any[] = [];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause += ' AND w.branch_id = $1';
      params.push(currentUser.branchId);
    }

    const result = await query(
      `SELECT 
        w.id, 
        w.warehouse_code as "warehouseCode", 
        w.warehouse_name as "warehouseName",
        w.warehouse_type as "warehouseType",
        w.branch_id as "branchId",
        b.branch_name as "branchName"
       FROM warehouses w
       LEFT JOIN branches b ON b.id = w.branch_id
       ${whereClause}
       ORDER BY w.warehouse_type, w.warehouse_name`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get inventory warehouses error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
