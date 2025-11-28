import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

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
    const showAll = searchParams.get('showAll') !== 'false'; // Mặc định hiển thị tất cả

    if (!warehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu warehouseId'
      }, { status: 400 });
    }

    // Lấy thông tin kho
    const warehouseInfo = await query(
      'SELECT id, warehouse_name, warehouse_type, branch_id FROM warehouses WHERE id = $1',
      [parseInt(warehouseId)]
    );

    if (warehouseInfo.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho'
      }, { status: 404 });
    }

    const warehouse = warehouseInfo.rows[0];
    const warehouseType = warehouse.warehouse_type;
    const warehouseBranchId = warehouse.branch_id;

    // Kiểm tra quyền truy cập kho
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId !== warehouseBranchId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không có quyền truy cập kho này'
      }, { status: 403 });
    }

    let details;
    let summary;

    if (warehouseType === 'NVL') {
      if (showAll) {
        // Hiển thị tất cả materials của chi nhánh (kể cả quantity = 0)
        details = await query(
          `SELECT 
            w.id as "warehouseId",
            w.warehouse_name as "warehouseName",
            m.material_code as "itemCode",
            m.material_name as "itemName",
            'NVL' as "itemType",
            CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
            m.unit
           FROM materials m
           CROSS JOIN warehouses w
           LEFT JOIN inventory_balances ib ON ib.material_id = m.id AND ib.warehouse_id = w.id
           WHERE w.id = $1 AND m.branch_id = $2
           ORDER BY m.material_name`,
          [parseInt(warehouseId), warehouseBranchId]
        );
      } else {
        // Chỉ hiển thị materials có tồn kho > 0
        details = await query(
          `SELECT 
            w.id as "warehouseId",
            w.warehouse_name as "warehouseName",
            m.material_code as "itemCode",
            m.material_name as "itemName",
            'NVL' as "itemType",
            CAST(ib.quantity AS DECIMAL(10,3)) as quantity,
            m.unit
           FROM inventory_balances ib
           JOIN warehouses w ON w.id = ib.warehouse_id
           JOIN materials m ON m.id = ib.material_id
           WHERE w.id = $1 AND m.branch_id = $2 AND ib.quantity > 0
           ORDER BY m.material_name`,
          [parseInt(warehouseId), warehouseBranchId]
        );
      }

      // Summary cho NVL
      summary = await query(
        `SELECT 
          m.material_code as "itemCode",
          m.material_name as "itemName",
          'NVL' as "itemType",
          CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
          m.unit
         FROM materials m
         LEFT JOIN inventory_balances ib ON ib.material_id = m.id AND ib.warehouse_id = $1
         WHERE m.branch_id = $2
         GROUP BY m.id, m.material_code, m.material_name, m.unit
         ORDER BY m.material_name`,
        [parseInt(warehouseId), warehouseBranchId]
      );

    } else {
      if (showAll) {
        // Hiển thị tất cả products của chi nhánh (kể cả quantity = 0)
        details = await query(
          `SELECT 
            w.id as "warehouseId",
            w.warehouse_name as "warehouseName",
            p.product_code as "itemCode",
            p.product_name as "itemName",
            'THANH_PHAM' as "itemType",
            CAST(COALESCE(ib.quantity, 0) AS DECIMAL(10,3)) as quantity,
            p.unit
           FROM products p
           CROSS JOIN warehouses w
           LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = w.id
           WHERE w.id = $1 AND p.branch_id = $2 AND p.is_active = true
           ORDER BY p.product_name`,
          [parseInt(warehouseId), warehouseBranchId]
        );
      } else {
        // Chỉ hiển thị products có tồn kho > 0
        details = await query(
          `SELECT 
            w.id as "warehouseId",
            w.warehouse_name as "warehouseName",
            p.product_code as "itemCode",
            p.product_name as "itemName",
            'THANH_PHAM' as "itemType",
            CAST(ib.quantity AS DECIMAL(10,3)) as quantity,
            p.unit
           FROM inventory_balances ib
           JOIN warehouses w ON w.id = ib.warehouse_id
           JOIN products p ON p.id = ib.product_id
           WHERE w.id = $1 AND p.branch_id = $2 AND p.is_active = true AND ib.quantity > 0
           ORDER BY p.product_name`,
          [parseInt(warehouseId), warehouseBranchId]
        );
      }

      // Summary cho products
      summary = await query(
        `SELECT 
          p.product_code as "itemCode",
          p.product_name as "itemName",
          'THANH_PHAM' as "itemType",
          CAST(COALESCE(SUM(ib.quantity), 0) AS DECIMAL(10,3)) as "totalQuantity",
          p.unit
         FROM products p
         LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.warehouse_id = $1
         WHERE p.branch_id = $2 AND p.is_active = true
         GROUP BY p.id, p.product_code, p.product_name, p.unit
         ORDER BY p.product_name`,
        [parseInt(warehouseId), warehouseBranchId]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        details: details.rows,
        summary: summary.rows
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi server'
    }, { status: 500 });
  }
}
