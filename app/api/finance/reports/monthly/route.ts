import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.reports', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const branchIdParam = searchParams.get('branchId');

    const params: any[] = [startDate, endDate];
    let branchFilter = '';

    // Xử lý filter chi nhánh
    if (user.roleCode !== 'ADMIN') {
      branchFilter = ' AND branch_id = $3';
      params.push(user.branchId);
    } else if (branchIdParam && branchIdParam !== 'all') {
      branchFilter = ' AND branch_id = $3';
      params.push(parseInt(branchIdParam));
    }

    const result = await query(`
      SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN transaction_type = 'THU' THEN amount ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'CHI' THEN amount ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN transaction_type = 'THU' THEN amount ELSE -amount END), 0) as profit
      FROM cash_books
      WHERE transaction_date::date BETWEEN $1::date AND $2::date${branchFilter}
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
      ORDER BY month
    `, params);

    const monthlyData = result.rows.map((row: any) => ({
      month: row.month,
      revenue: parseFloat(row.revenue || '0'),
      expense: parseFloat(row.expense || '0'),
      profit: parseFloat(row.profit || '0'),
    }));

    return NextResponse.json({ success: true, data: monthlyData });
  } catch (error: any) {
    console.error('Error fetching monthly data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu theo tháng' },
      { status: 500 }
    );
  }
}
