import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, user: currentUser, error } = await requirePermission('production.orders', 'create');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền thực hiện thao tác này'
            }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { warehouseId, items } = body; // items: { materialId, quantityPlanned, quantityActual }[]

        if (!warehouseId || !items || items.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng chọn kho và nguyên vật liệu'
            }, { status: 400 });
        }

        await query('BEGIN');

        try {
            // 1. Create Request
            const reqResult = await query(
                `INSERT INTO production_material_requests (production_order_id, warehouse_id, status)
         VALUES ($1, $2, 'CONFIRMED') RETURNING id`,
                [id, warehouseId]
            );
            const requestId = reqResult.rows[0].id;

            // 2. Create Request Details
            for (const item of items) {
                await query(
                    `INSERT INTO production_material_request_details (request_id, material_id, quantity_planned, quantity_actual)
           VALUES ($1, $2, $3, $4)`,
                    [requestId, item.materialId, item.quantityPlanned, item.quantityActual]
                );
            }

            // 3. Create Inventory Transaction (Export)
            // Generate Code
            const codeResult = await query(
                `SELECT 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
         FROM inventory_transactions 
         WHERE transaction_code LIKE 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
            );
            const transactionCode = codeResult.rows[0].code;

            const transResult = await query(
                `INSERT INTO inventory_transactions (transaction_code, transaction_type, from_warehouse_id, status, notes, created_by)
         VALUES ($1, 'XUAT', $2, 'PENDING', $3, $4)
         RETURNING id`,
                [transactionCode, warehouseId, `Xuất kho cho đơn sản xuất #${id}`, currentUser.id]
            );
            const transactionId = transResult.rows[0].id;

            // 4. Create Transaction Details
            for (const item of items) {
                await query(
                    `INSERT INTO inventory_transaction_details (transaction_id, material_id, quantity)
           VALUES ($1, $2, $3)`,
                    [transactionId, item.materialId, item.quantityActual]
                );
            }

            // 5. Update Production Order Status/Step
            // Move to IN_PROGRESS or keep at MATERIAL_IMPORT?
            // Let's update status to IN_PROGRESS to indicate work has started (materials requested)
            await query(
                `UPDATE production_orders SET status = 'IN_PROGRESS' WHERE id = $1`,
                [id]
            );

            await query('COMMIT');

            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Đã tạo yêu cầu và phiếu xuất kho thành công',
                data: { transactionId, transactionCode }
            });

        } catch (err) {
            await query('ROLLBACK');
            console.error('Transaction error:', err);
            throw err;
        }

    } catch (error) {
        console.error('Material import error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
