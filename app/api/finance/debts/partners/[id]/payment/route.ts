import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// POST - Thanh toán công nợ cho khách hàng hoặc nhà cung cấp
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'edit');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMethod, bankAccountId, notes, partnerType, orderId } = body;

    // Validate
    if (!paymentAmount || !paymentDate || !paymentMethod || !partnerType) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['customer', 'supplier'].includes(partnerType)) {
      return NextResponse.json(
        { success: false, error: 'partnerType phải là customer hoặc supplier' },
        { status: 400 }
      );
    }

    const partnerId = parseInt(id);
    const amount = parseFloat(paymentAmount);
    const transactionType = partnerType === 'customer' ? 'THU' : 'CHI';
    
    // Lấy thông tin khách hàng/nhà cung cấp
    const tableName = partnerType === 'customer' ? 'customers' : 'suppliers';
    const partnerResult = await query(
      `SELECT 
        ${partnerType === 'customer' ? 'customer_name' : 'supplier_name'} as name,
        ${partnerType === 'customer' ? 'customer_code' : 'supplier_code'} as code
      FROM ${tableName}
      WHERE id = $1`,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy ${partnerType === 'customer' ? 'khách hàng' : 'nhà cung cấp'}` },
        { status: 404 }
      );
    }

    const partner = partnerResult.rows[0];

    // Lấy danh sách đơn hàng chưa thanh toán đủ
    const orderTableName = partnerType === 'customer' ? 'orders' : 'purchase_orders';
    const partnerIdField = partnerType === 'customer' ? 'customer_id' : 'supplier_id';
    const amountField = partnerType === 'customer' ? 'final_amount' : 'total_amount';
    const orderCodeField = partnerType === 'customer' ? 'order_code' : 'po_code';
    
    // Nếu có orderId, chỉ lấy đơn hàng đó, ngược lại lấy theo FIFO
    let ordersQuery = `SELECT 
        id,
        ${orderCodeField} as "orderCode",
        ${amountField} as amount,
        COALESCE(paid_amount, 0) as "paidAmount",
        ${amountField} - COALESCE(paid_amount, 0) as "remainingAmount"
      FROM ${orderTableName}
      WHERE ${partnerIdField} = $1 
        AND status != 'CANCELLED'
        AND ${amountField} - COALESCE(paid_amount, 0) > 0`;
    
    const queryParams: number[] = [partnerId];
    
    if (orderId) {
      ordersQuery += ` AND id = $2`;
      queryParams.push(parseInt(orderId));
    }
    
    ordersQuery += ` ORDER BY created_at ASC`;
    
    const ordersResult = await query(ordersQuery, queryParams);

    if (ordersResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đơn hàng nào cần thanh toán' },
        { status: 404 }
      );
    }

    // Phân bổ tiền thanh toán vào các đơn hàng (FIFO - đơn cũ trước)
    let remainingPayment = amount;
    const updatedOrders = [];

    for (const order of ordersResult.rows) {
      if (remainingPayment <= 0) break;

      const orderIdNum = parseInt(order.id);
      const orderAmount = parseFloat(order.amount);
      const orderPaidAmount = parseFloat(order.paidAmount);
      const orderRemainingAmount = parseFloat(order.remainingAmount);
      
      const paymentForThisOrder = Math.min(remainingPayment, orderRemainingAmount);
      const newPaidAmount = orderPaidAmount + paymentForThisOrder;
      const newRemainingAmount = orderAmount - newPaidAmount;
      
      let newPaymentStatus = 'PARTIAL';
      if (newRemainingAmount <= 0) {
        newPaymentStatus = 'PAID';
      } else if (newPaidAmount === 0) {
        newPaymentStatus = 'UNPAID';
      }

      await query(
        `UPDATE ${orderTableName}
         SET 
           paid_amount = $1::numeric,
           payment_status = $2
         WHERE id = $3::integer`,
        [newPaidAmount, newPaymentStatus, orderIdNum]
      );

      // Ghi vào debt_management và debt_payments
      const referenceType = partnerType === 'customer' ? 'ORDER' : 'PURCHASE';
      const debtType = partnerType === 'customer' ? 'RECEIVABLE' : 'PAYABLE';
      
      // Tìm hoặc tạo debt_management record
      let debtResult = await query(
        `SELECT id, remaining_amount as "remainingAmount" FROM debt_management 
         WHERE reference_id = $1 AND reference_type = $2 AND debt_type = $3`,
        [orderIdNum, referenceType, debtType]
      );

      let debtId;
      if (debtResult.rows.length === 0) {
        // Tạo mới debt_management
        const debtCodeResult = await query(
          `SELECT 'CN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || 
           LPAD((COALESCE(MAX(CASE 
             WHEN debt_code ~ ('^CN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '[0-9]{4}$')
             THEN SUBSTRING(debt_code FROM 9 FOR 4)::INTEGER 
             ELSE 0 
           END), 0) + 1)::TEXT, 4, '0') as code
           FROM debt_management 
           WHERE DATE(created_at) = CURRENT_DATE`
        );
        const debtCode = debtCodeResult.rows[0].code;

        const partnerIdField2 = partnerType === 'customer' ? 'customer_id' : 'supplier_id';
        debtResult = await query(
          `INSERT INTO debt_management (
            debt_code, ${partnerIdField2}, debt_type, original_amount, remaining_amount, 
            reference_id, reference_type, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PARTIAL')
          RETURNING id, remaining_amount as "remainingAmount"`,
          [debtCode, partnerId, debtType, orderAmount, orderRemainingAmount, orderIdNum, referenceType]
        );
      }
      
      debtId = parseInt(debtResult.rows[0].id);
      const currentDebtRemaining = parseFloat(debtResult.rows[0].remainingAmount || 0);

      // Ghi vào debt_payments
      await query(
        `INSERT INTO debt_payments 
          (debt_id, payment_amount, payment_date, payment_method, bank_account_id, notes, created_by)
         VALUES ($1::integer, $2::numeric, $3, $4, $5::integer, $6, $7::integer)`,
        [debtId, paymentForThisOrder, paymentDate, paymentMethod, bankAccountId ? parseInt(bankAccountId) : null, notes || 'Thanh toán công nợ', user.id]
      );

      // Cập nhật remaining_amount trong debt_management
      const newDebtRemaining = Math.max(0, currentDebtRemaining - paymentForThisOrder);
      await query(
        `UPDATE debt_management 
         SET remaining_amount = $1::numeric,
             status = CASE WHEN $1::numeric <= 0 THEN 'PAID' ELSE 'PARTIAL' END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2::integer`,
        [newDebtRemaining, debtId]
      );

      updatedOrders.push({
        orderId: orderIdNum,
        orderCode: order.orderCode,
        paymentAmount: paymentForThisOrder,
        newPaidAmount,
        newPaymentStatus,
      });

      remainingPayment -= paymentForThisOrder;
    }

    // Cập nhật debt_amount của khách hàng/nhà cung cấp
    await query(
      `UPDATE ${tableName} SET debt_amount = GREATEST(0, COALESCE(debt_amount, 0) - $1::numeric) WHERE id = $2::integer`,
      [amount, partnerId]
    );

    // Cập nhật số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? amount : -amount;
      await query(
        `UPDATE bank_accounts 
         SET balance = balance + $1::numeric 
         WHERE id = $2::integer`,
        [balanceChange, parseInt(bankAccountId)]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thanh toán thành công',
      data: {
        totalPayment: amount,
        ordersUpdated: updatedOrders.length,
        details: updatedOrders,
      },
    });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
