import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách sổ quỹ
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const transactionType = searchParams.get('transactionType'); // THU, CHI
    const paymentMethod = searchParams.get('paymentMethod'); // CASH, BANK, TRANSFER
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');

    let sql = `
      SELECT 
        cb.id,
        cb.transaction_code as "transactionCode",
        cb.transaction_date as "transactionDate",
        cb.amount,
        cb.transaction_type as "transactionType",
        cb.payment_method as "paymentMethod",
        cb.description,
        cb.reference_type as "referenceType",
        cb.reference_id as "referenceId",
        cb.financial_category_id as "categoryId",
        cb.bank_account_id as "bankAccountId",
        fc.category_name as "categoryName",
        fc.category_code as "categoryCode",
        ba.account_number as "bankAccountNumber",
        ba.bank_name as "bankName",
        u.full_name as "createdByName",
        b.branch_name as "branchName",
        cb.created_at as "createdAt"
      FROM cash_books cb
      LEFT JOIN financial_categories fc ON fc.id = cb.financial_category_id
      LEFT JOIN bank_accounts ba ON ba.id = cb.bank_account_id
      LEFT JOIN users u ON u.id = cb.created_by
      LEFT JOIN branches b ON b.id = cb.branch_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by branch (nếu không phải ADMIN)
    if (user.roleCode !== 'ADMIN') {
      sql += ` AND cb.branch_id = $${paramCount}`;
      params.push(user.branchId);
      paramCount++;
    } else if (branchId) {
      sql += ` AND cb.branch_id = $${paramCount}`;
      params.push(branchId);
      paramCount++;
    }

    if (transactionType) {
      sql += ` AND cb.transaction_type = $${paramCount}`;
      params.push(transactionType);
      paramCount++;
    }

    if (paymentMethod) {
      sql += ` AND cb.payment_method = $${paramCount}`;
      params.push(paymentMethod);
      paramCount++;
    }

    if (startDate) {
      sql += ` AND cb.transaction_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      sql += ` AND cb.transaction_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    sql += ` ORDER BY cb.transaction_date DESC, cb.created_at DESC`;

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching cash books:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tạo phiếu thu/chi mới
export async function POST(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'create');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      transactionCode,
      transactionDate,
      financialCategoryId,
      amount,
      transactionType,
      paymentMethod,
      bankAccountId,
      referenceId,
      referenceType,
      description,
      branchId,
    } = body;

    // Validate
    if (!transactionCode || !transactionDate || !financialCategoryId || !amount || !transactionType || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['THU', 'CHI'].includes(transactionType)) {
      return NextResponse.json(
        { success: false, error: 'Loại giao dịch không hợp lệ' },
        { status: 400 }
      );
    }

    if (!['CASH', 'BANK', 'TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Phương thức thanh toán không hợp lệ' },
        { status: 400 }
      );
    }

    // Nếu thanh toán qua ngân hàng, phải có bank_account_id
    if ((paymentMethod === 'BANK' || paymentMethod === 'TRANSFER') && !bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'Phải chọn tài khoản ngân hàng' },
        { status: 400 }
      );
    }

    const finalBranchId = user.roleCode === 'ADMIN' ? branchId : user.branchId;

    const result = await query(
      `INSERT INTO cash_books 
        (transaction_code, transaction_date, financial_category_id, amount, 
         transaction_type, payment_method, bank_account_id, reference_id, 
         reference_type, description, created_by, branch_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id,
        transaction_code as "transactionCode",
        transaction_date as "transactionDate",
        amount,
        transaction_type as "transactionType",
        payment_method as "paymentMethod",
        description,
        created_at as "createdAt"`,
      [
        transactionCode,
        transactionDate,
        financialCategoryId,
        amount,
        transactionType,
        paymentMethod,
        bankAccountId || null,
        referenceId || null,
        referenceType || null,
        description,
        user.id,
        finalBranchId,
      ]
    );

    // Cập nhật số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? amount : -amount;
      await query(
        `UPDATE bank_accounts 
         SET balance = balance + $1 
         WHERE id = $2`,
        [balanceChange, bankAccountId]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating cash book:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Mã giao dịch đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
