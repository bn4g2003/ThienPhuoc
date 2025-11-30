import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem khách hàng'
      }, { status: 403 });
    }

    // Data segregation - Admin xem tất cả, user chỉ xem chi nhánh của mình
    let whereClause = 'WHERE 1=1';
    let params: any[] = [];
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause += ' AND c.branch_id = $1';
      params.push(currentUser.branchId);
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
        c.created_at as "createdAt",
        b.branch_name as "branchName"
       FROM customers c
       LEFT JOIN customer_groups cg ON cg.id = c.customer_group_id
       LEFT JOIN branches b ON b.id = c.branch_id
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
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
    let { customerCode, customerName, phone, email, address, customerGroupId } = body;

    // Tự động tạo mã khách hàng nếu không có
    if (!customerCode) {
      const countResult = await query(
        'SELECT COUNT(*) as count FROM customers'
      );
      const count = parseInt(countResult.rows[0].count) + 1;
      customerCode = `KH${count.toString().padStart(5, '0')}`;
    } else {
      // Kiểm tra mã khách hàng trùng nếu có customerCode
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
    }

    const result = await query(
      `INSERT INTO customers (
        customer_code, customer_name, phone, email, address, 
        customer_group_id, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        customer_code as "customerCode",
        customer_name as "customerName",
        phone,
        email,
        address,
        customer_group_id as "customerGroupId",
        0 as "priceMultiplier"`,
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
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
