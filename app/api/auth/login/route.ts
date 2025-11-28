import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken, setAuthCookie } from '@/lib/auth';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      }, { status: 400 });
    }

    // Tìm user (tạm thời không mã hóa password)
    const result = await query(
      `SELECT u.*, r.role_code 
       FROM users u 
       JOIN roles r ON r.id = u.role_id 
       WHERE u.username = $1 AND u.is_active = true`,
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tên đăng nhập không tồn tại'
      }, { status: 401 });
    }

    const user = result.rows[0];

    // Kiểm tra password (tạm thời so sánh trực tiếp)
    if (user.password_hash !== password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mật khẩu không đúng'
      }, { status: 401 });
    }

    // Tạo token
    const token = generateToken({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      branchId: user.branch_id,
      roleId: user.role_id,
      roleCode: user.role_code,
    });

    // Set cookie
    await setAuthCookie(token);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          branchId: user.branch_id,
          roleCode: user.role_code,
        }
      },
      message: 'Đăng nhập thành công'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
