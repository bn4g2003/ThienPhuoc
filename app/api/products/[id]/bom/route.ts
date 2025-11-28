import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xem BOM (định mức)
    const { hasPermission, error } = await requirePermission('products.bom', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem định mức sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT 
        b.id,
        b.material_id as "materialId",
        b.quantity,
        b.unit,
        b.notes,
        m.material_name as "materialName"
       FROM bom b
       JOIN materials m ON m.id = b.material_id
       WHERE b.product_id = $1
       ORDER BY b.id`,
      [id]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get BOM error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
