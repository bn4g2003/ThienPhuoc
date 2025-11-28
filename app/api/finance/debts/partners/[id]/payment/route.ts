import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

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
    const { paymentAmount, paymentDate, paymentMethod, bankAccountId, notes, partnerType } = body;

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

    const amount = parseFloat(paymentAmount);
    const transactionType = partnerType === 'customer' ? 'THU' : 'CHI';
    const transactionCode = `${transactionType === 'THU' ? 'PT' : 'PC'}-${partnerType === 'customer' ? 'KH' : 'NCC'}${id}-${Date.now()}`;
    
    // Lấy thông tin khách hàng/nhà cung cấp
    const tableName = partnerType === 'customer' ? 'customers' : 'suppliers';
    const partnerResult = await query(
      `SELECT 
        ${partnerType === 'customer' ? 'customer_name' : 'supplier_name'} as name,
        ${partnerType === 'customer' ? 'customer_code' : 'supplier_code'} as code
      FROM ${tableName}
      WHERE id = $1`,
      [id]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy ${partnerType === 'customer' ? 'khách hàng' : 'nhà cung cấp'}` },
        { status: 404 }
      );
    }

    const partner = partnerResult.rows[0];

    // Lấy danh sách đơn hàng chưa thanh toán đủ (theo thứ tự cũ nhất trước)
    const orderTableName = partnerType === 'customer' ? 'orders' : 'purchase_orders';
    const partnerIdField = partnerType === 'customer' ? 'customer_id' : 'supplier_id';
    const amountField = partnerType === 'customer' ? 'final_amount' : 'total_amount';
    
    const ordersResult = await query(
      `SELECT 
        id,
        ${amountField} as amount,
        COALESCE(paid_amount, 0) as "paidAmount",
        ${amountField} - COALESCE(paid_amount, 0) as "remainingAmount"
      FROM ${orderTableName}
      WHERE ${partnerIdField} = $1 
        AND status != 'CANCELLED'
        AND ${amountField} - COALESCE(paid_amount, 0) > 0
      ORDER BY created_at ASC`,
      [id]
    );

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

      const paymentForThisOrder = Math.min(remainingPayment, order.remainingAmount);
      const newPaidAmount = parseFloat(order.paidAmount) + paymentForThisOrder;
      const newRemainingAmount = parseFloat(order.amount) - newPaidAmount;
      
      let newPaymentStatus = 'PARTIAL';
      if (newRemainingAmount === 0) {
        newPaymentStatus = 'PAID';
      } else if (newPaidAmount === 0) {
        newPaymentStatus = 'UNPAID';
      }

      await query(
        `UPDATE ${orderTableName}
         SET 
           paid_amount = $1,
           payment_status = $2
         WHERE id = $3`,
        [newPaidAmount, newPaymentStatus, order.id]
      );

      updatedOrders.push({
        orderId: order.id,
        paymentAmount: paymentForThisOrder,
        newPaidAmount,
        newPaymentStatus,
      });

      remainingPayment -= paymentForThisOrder;
    }

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
