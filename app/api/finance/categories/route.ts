import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// GET - Lấy danh sách danh mục tài chính
export async function GET(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // THU hoặc CHI
    const isActive = searchParams.get('isActive');

    let sql = `
      SELECT 
        id,
        category_code as "categoryCode",
        category_name as "categoryName",
        type,
        description,
        is_active as "isActive",
        created_at as "createdAt"
      FROM financial_categories
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      sql += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (isActive !== null && isActive !== undefined) {
      sql += ` AND is_active = $${paramCount}`;
      params.push(isActive === 'true');
      paramCount++;
    }

    sql += ` ORDER BY type, category_name`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching financial categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tạo danh mục tài chính mới
export async function POST(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'create');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { categoryCode, categoryName, type, description } = body;

    // Validate
    if (!categoryCode || !categoryName || !type) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['THU', 'CHI'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Loại danh mục không hợp lệ (THU hoặc CHI)' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO financial_categories 
        (category_code, category_name, type, description)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        category_code as "categoryCode",
        category_name as "categoryName",
        type,
        description,
        is_active as "isActive",
        created_at as "createdAt"`,
      [categoryCode, categoryName, type, description]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating financial category:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Mã danh mục đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
