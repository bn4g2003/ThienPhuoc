import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem hàng hoá'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const itemType = searchParams.get('type') || '';

    let sql = `
      SELECT 
        i.id,
        i.item_code as "itemCode",
        i.item_name as "itemName",
        i.item_type as "itemType",
        i.product_id as "productId",
        i.material_id as "materialId",
        i.category_id as "categoryId",
        i.unit,
        i.cost_price as "costPrice",
        i.is_active as "isActive",
        i.created_at as "createdAt",
        CASE 
          WHEN i.item_type = 'PRODUCT' THEN p.product_name
          WHEN i.item_type = 'MATERIAL' THEN m.material_name
        END as "sourceName",
        CASE 
          WHEN i.item_type = 'PRODUCT' THEN p.product_code
          WHEN i.item_type = 'MATERIAL' THEN m.material_code
        END as "sourceCode",
        ic.category_name as "categoryName"
      FROM items i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN materials m ON i.material_id = m.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (i.item_code ILIKE $${paramIndex} OR i.item_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (itemType) {
      sql += ` AND i.item_type = $${paramIndex}`;
      params.push(itemType);
      paramIndex++;
    }

    sql += ` ORDER BY i.created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get items error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('products', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo hàng hoá'
      }, { status: 403 });
    }

    const body = await request.json();
    const { itemCode, itemName, itemType, productId, materialId, categoryId, unit, costPrice } = body;

    if (!itemCode || !itemName || !itemType || !unit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    if (itemType === 'PRODUCT' && !productId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn sản phẩm'
      }, { status: 400 });
    }

    if (itemType === 'MATERIAL' && !materialId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn nguyên vật liệu'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO items (item_code, item_name, item_type, product_id, material_id, category_id, unit, cost_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, item_code as "itemCode", item_name as "itemName"`,
      [
        itemCode,
        itemName,
        itemType,
        itemType === 'PRODUCT' ? productId : null,
        itemType === 'MATERIAL' ? materialId : null,
        categoryId || null,
        unit,
        costPrice || 0
      ]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo hàng hoá thành công'
    });

  } catch (error: any) {
    console.error('Create item error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã hàng hoá đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
