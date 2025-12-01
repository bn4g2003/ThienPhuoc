import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('products.categories', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem danh mục'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT
        ic.id,
        ic.category_code as "categoryCode",
        ic.category_name as "categoryName",
        ic.parent_id as "parentId",
        ic.description,
        ic.is_active as "isActive",
        ic.created_at as "createdAt",
        parent.category_name as "parentName"
       FROM item_categories ic
       LEFT JOIN item_categories parent ON ic.parent_id = parent.id
       ORDER BY ic.category_code`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get item categories error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('products.categories', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo danh mục'
      }, { status: 403 });
    }

    const body = await request.json();
    let { categoryName, parentId, description } = body;

    console.log('POST item-category body:', { categoryName, parentId, description, parentIdType: typeof parentId });

    if (!categoryName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập tên danh mục'
      }, { status: 400 });
    }

    // Xử lý parentId - nếu là string (tên mới) thì tạo danh mục cha mới
    let finalParentId = null;
    
    // Xử lý array rỗng hoặc undefined
    if (Array.isArray(parentId) && parentId.length === 0) {
      parentId = null;
    }
    
    if (parentId) {
      if (Array.isArray(parentId) && parentId.length > 0) {
        // Ant Design Select mode="tags" trả về array
        const firstValue = parentId[0];
        console.log('Array parentId, firstValue:', firstValue, 'type:', typeof firstValue);
        
        if (typeof firstValue === 'string') {
          // Kiểm tra xem có phải là số dạng string không
          const numValue = parseInt(firstValue);
          if (!isNaN(numValue)) {
            // Là số dạng string, convert sang number
            finalParentId = numValue;
          } else {
            // Là tên mới, tạo danh mục cha mới
            const parentCode = await query(
              `SELECT 'DM' || LPAD((COALESCE(MAX(SUBSTRING(category_code FROM 3)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
               FROM item_categories`
            );
            
            const newParent = await query(
              `INSERT INTO item_categories (category_code, category_name, parent_id, description)
               VALUES ($1, $2, NULL, $3)
               RETURNING id`,
              [parentCode.rows[0].code, firstValue, `Danh mục cha tự động tạo`]
            );
            
            finalParentId = newParent.rows[0].id;
          }
        } else {
          finalParentId = firstValue;
        }
      } else if (typeof parentId === 'string') {
        console.log('String parentId:', parentId);
        // Kiểm tra xem có phải là số dạng string không
        const numValue = parseInt(parentId);
        if (!isNaN(numValue)) {
          // Là số dạng string, convert sang number
          finalParentId = numValue;
        } else {
          // Là tên mới, tạo danh mục cha mới
          const parentCode = await query(
            `SELECT 'DM' || LPAD((COALESCE(MAX(SUBSTRING(category_code FROM 3)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
             FROM item_categories`
          );
          
          const newParent = await query(
            `INSERT INTO item_categories (category_code, category_name, parent_id, description)
             VALUES ($1, $2, NULL, $3)
             RETURNING id`,
            [parentCode.rows[0].code, parentId, `Danh mục cha tự động tạo`]
          );
          
          finalParentId = newParent.rows[0].id;
        }
      } else if (typeof parentId === 'number') {
        finalParentId = parentId;
      }
    }
    
    console.log('Final parentId:', finalParentId);

    // Tạo mã tự động - chỉ lấy từ item_categories và chỉ những mã bắt đầu bằng 'DM'
    const codeResult = await query(
      `SELECT 'DM' || LPAD((COALESCE(MAX(CASE 
         WHEN category_code ~ '^DM[0-9]+$' 
         THEN SUBSTRING(category_code FROM 3)::INTEGER 
         ELSE 0 
       END), 0) + 1)::TEXT, 4, '0') as code
       FROM item_categories`
    );
    const categoryCode = codeResult.rows[0].code;

    console.log('About to INSERT with values:', {
      categoryCode,
      categoryName,
      finalParentId,
      description: description || null,
      types: {
        categoryCode: typeof categoryCode,
        categoryName: typeof categoryName,
        finalParentId: typeof finalParentId,
        description: typeof description
      }
    });

    const result = await query(
      `INSERT INTO item_categories (category_code, category_name, parent_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category_code as "categoryCode", category_name as "categoryName"`,
      [categoryCode, categoryName, finalParentId, description || null]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo danh mục thành công'
    });

  } catch (error: any) {
    console.error('Create item category error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã danh mục đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
