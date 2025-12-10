import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn hàng'
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchIdParam = searchParams.get('branchId');
    const customerId = searchParams.get('customerId');

    const params: any[] = [];
    let paramIndex = 1;
    let whereConditions: string[] = [];

    // Branch filter
    if (currentUser.roleCode !== 'ADMIN') {
      whereConditions.push(`o.branch_id = $${paramIndex}`);
      params.push(currentUser.branchId);
      paramIndex++;
    } else if (branchIdParam && branchIdParam !== 'all') {
      whereConditions.push(`o.branch_id = $${paramIndex}`);
      params.push(parseInt(branchIdParam));
      paramIndex++;
    }

    // Search filter
    if (search) {
      whereConditions.push(`(o.order_code ILIKE $${paramIndex} OR c.customer_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter
    if (status) {
      whereConditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Customer filter
    if (customerId) {
      whereConditions.push(`o.customer_id = $${paramIndex}`);
      params.push(parseInt(customerId));
      paramIndex++;
    }

    // Date range filter
    if (startDate) {
      whereConditions.push(`o.order_date::date >= $${paramIndex}::date`);
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      whereConditions.push(`o.order_date::date <= $${paramIndex}::date`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const result = await query(
      `SELECT 
        o.id,
        o.order_code as "orderCode",
        c.customer_name as "customerName",
        o.order_date as "orderDate",
        o.total_amount as "totalAmount",
        o.discount_amount as "discountAmount",
        o.final_amount as "finalAmount",
        COALESCE(o.deposit_amount, 0) as "depositAmount",
        COALESCE(o.paid_amount, 0) as "paidAmount",
        COALESCE(o.payment_status, 'UNPAID') as "paymentStatus",
        o.status,
        u.full_name as "createdBy",
        o.created_at as "createdAt"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u ON u.id = o.created_by
       ${whereClause}
       ORDER BY o.created_at DESC`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

async function createQuickCustomer(customerData: any, branchId: number) {
  let customerCode: string;
  let phone = customerData.phone;

  if (phone) {
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error('Số điện thoại không hợp lệ (phải là 10-11 số, bắt đầu bằng 0 hoặc +84)');
    }
    phone = cleanPhone;

    const last6Digits = phone.slice(-6);
    customerCode = `KH${last6Digits}`;

    const checkResult = await query(
      'SELECT customer_code FROM customers WHERE customer_code LIKE $1 ORDER BY customer_code DESC LIMIT 1',
      [`${customerCode}%`]
    );

    if (checkResult.rows.length > 0) {
      const existingCode = checkResult.rows[0].customer_code;
      const match = existingCode.match(/_(\d+)$/);
      const nextNum = match ? parseInt(match[1]) + 1 : 1;
      customerCode = `${customerCode}_${nextNum.toString().padStart(2, '0')}`;
    }
  } else {
    const codeResult = await query(
      `SELECT 'KH' || LPAD((COALESCE(MAX(CASE 
         WHEN customer_code ~ '^KH[0-9]+$' 
         THEN SUBSTRING(customer_code FROM 3)::INTEGER 
         ELSE 0 
       END), 0) + 1)::TEXT, 6, '0') as code
       FROM customers`
    );
    customerCode = codeResult.rows[0].code;
  }

  const result = await query(
    `INSERT INTO customers (customer_code, customer_name, phone, address, branch_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, customer_code as "customerCode", customer_name as "customerName"`,
    [customerCode, customerData.customerName, phone || null, customerData.address || null, branchId]
  );

  return result.rows[0];
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo đơn hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { customerId, newCustomer, orderDate, items, discountAmount, depositAmount, notes } = body;

    if (!items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Đơn hàng phải có ít nhất 1 hàng hoá'
      }, { status: 400 });
    }

    let finalCustomerId = customerId;
    if (!customerId && newCustomer) {
      if (!newCustomer.customerName) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Vui lòng nhập tên khách hàng'
        }, { status: 400 });
      }
      const createdCustomer = await createQuickCustomer(newCustomer, currentUser.branchId);
      finalCustomerId = createdCustomer.id;
    }

    if (!finalCustomerId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn hoặc tạo khách hàng'
      }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unitPrice), 0
    );
    const finalAmount = totalAmount - (discountAmount || 0);
    
    // Validate deposit amount
    const deposit = parseFloat(depositAmount || 0);
    if (deposit < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tiền đặt cọc không được âm'
      }, { status: 400 });
    }
    if (deposit > finalAmount) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tiền đặt cọc không được vượt quá tổng tiền đơn hàng'
      }, { status: 400 });
    }

    const codeResult = await query(
      `SELECT 'DH' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || 
       LPAD((COALESCE(MAX(CASE 
         WHEN order_code ~ ('^DH' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '[0-9]{4}$')
         THEN SUBSTRING(order_code FROM 9 FOR 4)::INTEGER 
         ELSE 0 
       END), 0) + 1)::TEXT, 4, '0') as code
       FROM orders 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const orderCode = codeResult.rows[0].code;

    // Calculate payment status based on deposit_amount
    let paymentStatus = 'UNPAID';
    if (deposit > 0 && deposit >= finalAmount) {
      paymentStatus = 'PAID';
    } else if (deposit > 0) {
      paymentStatus = 'PARTIAL';
    }

    const orderResult = await query(
      `INSERT INTO orders (
        order_code, customer_id, branch_id, order_date,
        total_amount, discount_amount, final_amount,
        deposit_amount, payment_status,
        notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        orderCode,
        finalCustomerId,
        currentUser.branchId,
        orderDate,
        totalAmount,
        discountAmount || 0,
        finalAmount,
        deposit || 0,
        paymentStatus,
        notes || null,
        currentUser.id
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const detailResult = await query(
        `INSERT INTO order_details (
          order_id, item_id, product_id, quantity, unit_price, 
          cost_price, total_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          orderId,
          item.itemId || null,
          item.productId || null,
          item.quantity,
          item.unitPrice,
          item.costPrice || 0,
          item.quantity * item.unitPrice,
          item.notes || null
        ]
      );

      const detailId = detailResult.rows[0].id;

      // Save measurements if any
      if (item.measurements && Array.isArray(item.measurements)) {
        for (const m of item.measurements) {
          if (m.attributeId && m.value) {
            await query(
              `INSERT INTO order_item_measurements (order_detail_id, attribute_id, value)
               VALUES ($1, $2, $3)`,
              [detailId, m.attributeId, m.value]
            );
          }
        }
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: orderId, orderCode }
    });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
