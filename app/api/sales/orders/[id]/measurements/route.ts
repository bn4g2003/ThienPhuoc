import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('sales.orders', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền chỉnh sửa đơn hàng'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const orderId = parseInt(resolvedParams.id);
        const body = await request.json();
        const { measurements } = body; // Array of { orderDetailId, attributeId, value }

        if (!Array.isArray(measurements)) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Dữ liệu không hợp lệ'
            }, { status: 400 });
        }

        // Begin transaction (implicitly handled by individual queries for now, or use a transaction block if db supports it via this driver)
        // For simplicity, we'll loop and upsert. A better approach would be a single query or transaction.

        for (const m of measurements) {
            const { orderDetailId, attributeId, value } = m;

            // Check if measurement exists
            const existing = await query(
                `SELECT id FROM order_item_measurements 
         WHERE order_detail_id = $1 AND attribute_id = $2`,
                [orderDetailId, attributeId]
            );

            if (existing.rows.length > 0) {
                // Update
                await query(
                    `UPDATE order_item_measurements 
           SET value = $1 
           WHERE id = $2`,
                    [value, existing.rows[0].id]
                );
            } else {
                // Insert
                await query(
                    `INSERT INTO order_item_measurements (order_detail_id, attribute_id, value)
           VALUES ($1, $2, $3)`,
                    [orderDetailId, attributeId, value]
                );
            }
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Cập nhật thông số thành công'
        });

    } catch (error) {
        console.error('Update measurements error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
