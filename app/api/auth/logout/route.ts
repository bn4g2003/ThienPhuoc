import { NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';
import { ApiResponse } from '@/types';

export async function POST() {
  try {
    await removeAuthCookie();
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
