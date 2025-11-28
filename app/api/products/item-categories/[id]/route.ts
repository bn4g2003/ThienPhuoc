import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('products', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa danh mục'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { categoryName, parentId, description, isActive } = body;

    const result = await query(
      `UPDATE item_categories 
       SET category_name = COALESCE($1, category_name),
           parent_id = $2,
           description = $3,
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, category_code as "categoryCode", category_name as "categoryName"`,
      [categoryName, parentId, description, isActive, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy danh mục'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật danh mục thành công'
    });

  } catch (error) {
    console.error('Update item category error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('products', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa danh mục'
      }, { status: 403 });
    }

    const { id } = await params;

    // Check if category has items
    const checkItems = await query(
      `SELECT COUNT(*) as count FROM items WHERE category_id = $1`,
      [id]
    );

    if (parseInt(checkItems.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa danh mục đang có hàng hoá'
      }, { status: 400 });
    }

    // Check if category has children
    const checkChildren = await query(
      `SELECT COUNT(*) as count FROM item_categories WHERE parent_id = $1`,
      [id]
    );

    if (parseInt(checkChildren.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa danh mục đang có danh mục con'
      }, { status: 400 });
    }

    await query('DELETE FROM item_categories WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa danh mục thành công'
    });

  } catch (error) {
    console.error('Delete item category error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
