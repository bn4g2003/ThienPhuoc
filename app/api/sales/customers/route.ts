import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem khách hàng'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        c.id,
        c.customer_code as "customerCode",
        c.customer_name as "customerName",
        c.phone,
        c.email,
        c.address,
        c.customer_group_id as "customerGroupId",
        cg.group_name as "groupName",
        COALESCE(cg.price_multiplier, 0) as "priceMultiplier",
        c.debt_amount as "debtAmount",
        c.is_active as "isActive",
        c.created_at as "createdAt"
       FROM customers c
       LEFT JOIN customer_groups cg ON cg.id = c.customer_group_id
       WHERE c.branch_id = $1
       ORDER BY c.created_at DESC`,
      [currentUser.branchId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo khách hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { customerCode, customerName, phone, email, address, customerGroupId } = body;

    // Kiểm tra mã khách hàng trùng
    const checkResult = await query(
      'SELECT id FROM customers WHERE customer_code = $1',
      [customerCode]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã khách hàng đã tồn tại'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO customers (
        customer_code, customer_name, phone, email, address, 
        customer_group_id, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        customerCode,
        customerName,
        phone || null,
        email || null,
        address || null,
        customerGroupId || null,
        currentUser.branchId
      ]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
