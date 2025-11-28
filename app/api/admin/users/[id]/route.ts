import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

// PUT - Cập nhật user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền chỉnh sửa user
    const { hasPermission, error } = await requirePermission('admin.users', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa người dùng'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fullName, email, phone, branchId, roleId, isActive } = body;

    const result = await query(
      `UPDATE users 
       SET full_name = $1, email = $2, phone = $3, branch_id = $4, role_id = $5, is_active = $6
       WHERE id = $7
       RETURNING id, user_code as "userCode", username, full_name as "fullName"`,
      [fullName, email, phone, branchId, roleId, isActive, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy người dùng'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// DELETE - Xóa user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xóa user
    const { hasPermission, error } = await requirePermission('admin.users', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa người dùng'
      }, { status: 403 });
    }

    const { id } = await params;

    await query('DELETE FROM users WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa người dùng thành công'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
