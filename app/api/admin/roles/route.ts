import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET() {
  try {
    // Kiểm tra quyền xem roles
    const { hasPermission, error } = await requirePermission('admin.roles', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền truy cập'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        r.id, r.role_code as "roleCode", r.role_name as "roleName", r.description,
        COUNT(u.id) as "userCount"
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       GROUP BY r.id, r.role_code, r.role_name, r.description
       ORDER BY r.id`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo role
    const { hasPermission, error } = await requirePermission('admin.roles', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo vai trò'
      }, { status: 403 });
    }

    const body = await request.json();
    const { roleCode, roleName, description } = body;

    if (!roleCode || !roleName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO roles (role_code, role_name, description)
       VALUES ($1, $2, $3)
       RETURNING id, role_code as "roleCode", role_name as "roleName"`,
      [roleCode, roleName, description]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo vai trò thành công'
    });

  } catch (error: any) {
    console.error('Create role error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã vai trò đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
