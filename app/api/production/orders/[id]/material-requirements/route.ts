import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('production.orders', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem đơn sản xuất'
            }, { status: 403 });
        }

        const { id } = await params;

        // 1. Get Production Order Items
        const poResult = await query(
            `SELECT order_id FROM production_orders WHERE id = $1`,
            [id]
        );

        if (poResult.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy đơn sản xuất'
            }, { status: 404 });
        }

        const orderId = poResult.rows[0].order_id;

        // 2. Get Order Items and their Norms
        // We need to sum up (Item Quantity * Norm Quantity) for each material
        const result = await query(
            `SELECT 
        pm.material_id as "materialId",
        m.item_name as "materialName",
        m.item_code as "materialCode",
        m.unit,
        SUM(od.quantity * pm.quantity) as "quantityPlanned"
       FROM order_details od
       JOIN product_materials pm ON od.item_id = pm.item_id
       JOIN items m ON pm.material_id = m.id
       WHERE od.order_id = $1
       GROUP BY pm.material_id, m.item_name, m.item_code, m.unit`,
            [orderId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get material requirements error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
