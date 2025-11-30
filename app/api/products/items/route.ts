import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem hàng hoá'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const itemType = searchParams.get('type') || '';
    const sellableOnly = searchParams.get('sellable') === 'true';

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
        COALESCE(i.is_sellable, i.item_type = 'PRODUCT') as "isSellable",
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
    const params: (string | boolean)[] = [];
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

    if (sellableOnly) {
      sql += ` AND COALESCE(i.is_sellable, i.item_type = 'PRODUCT') = true`;
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
    const { itemCode, itemName, itemType, categoryId, unit, costPrice, isSellable } = body;

    if (!itemCode || !itemName || !itemType || !unit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin bắt buộc (mã, tên, loại, đơn vị)'
      }, { status: 400 });
    }

    if (!['PRODUCT', 'MATERIAL'].includes(itemType)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Loại hàng hoá không hợp lệ'
      }, { status: 400 });
    }

    // Lấy branch_id từ user hiện tại
    const branchId = currentUser.branchId;

    // Bắt đầu transaction
    await query('BEGIN');

    try {
      let productId = null;
      let materialId = null;

      // Tự động tạo product hoặc material tương ứng
      if (itemType === 'PRODUCT') {
        // Tạo sản phẩm mới với branch_id
        const productResult = await query(
          `INSERT INTO products (product_code, product_name, unit, cost_price, is_active, branch_id)
           VALUES ($1, $2, $3, $4, true, $5)
           RETURNING id`,
          [itemCode, itemName, unit, costPrice || 0, branchId]
        );
        productId = productResult.rows[0].id;
      } else {
        // Tạo nguyên vật liệu mới với branch_id
        const materialResult = await query(
          `INSERT INTO materials (material_code, material_name, unit, branch_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [itemCode, itemName, unit, branchId]
        );
        materialId = materialResult.rows[0].id;
      }

      // Xác định giá trị is_sellable
      // Mặc định: PRODUCT = true, MATERIAL = false
      // Có thể override bằng tham số isSellable
      const sellable = isSellable !== undefined 
        ? isSellable 
        : (itemType === 'PRODUCT');

      // Tạo item
      const result = await query(
        `INSERT INTO items (item_code, item_name, item_type, product_id, material_id, category_id, unit, cost_price, is_sellable)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, item_code as "itemCode", item_name as "itemName", item_type as "itemType", is_sellable as "isSellable"`,
        [
          itemCode,
          itemName,
          itemType,
          productId,
          materialId,
          categoryId || null,
          unit,
          costPrice || 0,
          sellable
        ]
      );

      await query('COMMIT');

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result.rows[0],
        message: `Tạo hàng hoá thành công${itemType === 'PRODUCT' ? ' (đã tạo sản phẩm tương ứng)' : ' (đã tạo NVL tương ứng)'}`
      });

    } catch (innerError) {
      await query('ROLLBACK');
      throw innerError;
    }

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
      error: 'Lỗi server: ' + (error.message || 'Unknown error')
    }, { status: 500 });
  }
}
