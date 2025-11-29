import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const result = await query(`
      WITH all_transactions AS (
        -- Thu từ cash_books
        SELECT 
          transaction_date::date as date,
          amount as cash_in,
          0 as cash_out
        FROM cash_books
        WHERE transaction_type = 'THU'
          AND transaction_date::date BETWEEN $1::date AND $2::date
        
        UNION ALL
        
        -- Chi từ cash_books
        SELECT 
          transaction_date::date as date,
          0 as cash_in,
          amount as cash_out
        FROM cash_books
        WHERE transaction_type = 'CHI'
          AND transaction_date::date BETWEEN $1::date AND $2::date
        
        UNION ALL
        
        -- Thu từ orders
        SELECT 
          order_date::date as date,
          COALESCE(paid_amount, 0) as cash_in,
          0 as cash_out
        FROM orders
        WHERE status != 'CANCELLED'
          AND paid_amount > 0
          AND order_date::date BETWEEN $1::date AND $2::date
        
        UNION ALL
        
        -- Chi từ purchase_orders
        SELECT 
          order_date::date as date,
          0 as cash_in,
          COALESCE(paid_amount, 0) as cash_out
        FROM purchase_orders
        WHERE status != 'CANCELLED'
          AND paid_amount > 0
          AND order_date::date BETWEEN $1::date AND $2::date
      ),
      daily_transactions AS (
        SELECT 
          date,
          COALESCE(SUM(cash_in), 0) as cash_in,
          COALESCE(SUM(cash_out), 0) as cash_out
        FROM all_transactions
        GROUP BY date
      ),
      cumulative AS (
        SELECT 
          date,
          cash_in,
          cash_out,
          SUM(cash_in - cash_out) OVER (ORDER BY date) as balance
        FROM daily_transactions
      )
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        cash_in,
        cash_out,
        balance
      FROM cumulative
      ORDER BY date
    `, [startDate, endDate]);

    const cashFlowData = result.rows.map((row: any) => ({
      date: row.date,
      cashIn: parseFloat(row.cash_in || '0'),
      cashOut: parseFloat(row.cash_out || '0'),
      balance: parseFloat(row.balance || '0'),
    }));

    return NextResponse.json({ success: true, data: cashFlowData });
  } catch (error: any) {
    console.error('Error fetching cash flow data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu dòng tiền' },
      { status: 500 }
    );
  }
}
