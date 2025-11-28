import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem danh mục'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        ic.id,
        ic.category_code as "categoryCode",
        ic.category_name as "categoryName",
        ic.parent_id as "parentId",
        ic.description,
        ic.is_active as "isActive",
        ic.created_at as "createdAt",
        parent.category_name as "parentName"
       FROM item_categories ic
       LEFT JOIN item_categories parent ON ic.parent_id = parent.id
       ORDER BY ic.category_code`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get item categories error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('products', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo danh mục'
      }, { status: 403 });
    }

    const body = await request.json();
    const { categoryCode, categoryName, parentId, description } = body;

    if (!categoryCode || !categoryName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO item_categories (category_code, category_name, parent_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category_code as "categoryCode", category_name as "categoryName"`,
      [categoryCode, categoryName, parentId || null, description || null]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo danh mục thành công'
    });

  } catch (error: any) {
    console.error('Create item category error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã danh mục đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
