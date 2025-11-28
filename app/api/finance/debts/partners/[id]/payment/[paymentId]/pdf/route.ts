import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('finance.debts', 'view');
    if (!hasPermission) {
      return new NextResponse('Không có quyền xem phiếu thanh toán', { status: 403 });
    }

    const resolvedParams = await params;
    const partnerId = parseInt(resolvedParams.id);
    const paymentId = parseInt(resolvedParams.paymentId);

    // Lấy thông tin thanh toán từ URL params
    const { searchParams } = new URL(request.url);
    const partnerType = searchParams.get('type') as 'customer' | 'supplier';
    const paymentAmount = parseFloat(searchParams.get('amount') || '0');
    const paymentDate = searchParams.get('date') || new Date().toISOString();
    const paymentMethod = searchParams.get('method') || 'CASH';
    const bankAccountId = searchParams.get('bankAccountId');
    const notes = searchParams.get('notes') || '';

    if (!partnerType) {
      return new NextResponse('Thiếu thông tin loại đối tác', { status: 400 });
    }

    // Lấy thông tin đối tác
    const tableName = partnerType === 'customer' ? 'customers' : 'suppliers';
    const nameField = partnerType === 'customer' ? 'customer_name' : 'supplier_name';
    const codeField = partnerType === 'customer' ? 'customer_code' : 'supplier_code';

    const partnerResult = await query(
      `SELECT 
        ${nameField} as name,
        ${codeField} as code,
        phone,
        address
       FROM ${tableName}
       WHERE id = $1`,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return new NextResponse('Không tìm thấy đối tác', { status: 404 });
    }

    const partner = partnerResult.rows[0];

    // Lấy thông tin tài khoản ngân hàng nếu có
    let bankAccount = null;
    if (bankAccountId) {
      const bankResult = await query(
        `SELECT bank_name, account_number, branch_name
         FROM bank_accounts
         WHERE id = $1`,
        [bankAccountId]
      );
      if (bankResult.rows.length > 0) {
        bankAccount = bankResult.rows[0];
      }
    }

    // Lấy thông tin công ty
    const companyResult = await query(
      `SELECT company_name, tax_code, address, phone, email 
       FROM company_config 
       LIMIT 1`
    );
    const company = companyResult.rows[0] || {};

    const isReceipt = partnerType === 'customer';
    const title = isReceipt ? 'PHIẾU THU CÔNG NỢ' : 'PHIẾU TRẢ CÔNG NỢ';
    const partnerLabel = partnerType === 'customer' ? 'Khách hàng' : 'Nhà cung cấp';

    const paymentMethodMap: any = {
      'CASH': 'Tiền mặt',
      'BANK': 'Ngân hàng',
      'TRANSFER': 'Chuyển khoản',
    };

    const paymentCode = `PT-${partnerType === 'customer' ? 'KH' : 'NCC'}${partnerId}-${paymentId}`;

    // Tạo HTML cho PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
    .company-info { font-size: 12px; color: #666; line-height: 1.6; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0 10px 0; text-transform: uppercase; }
    .receipt-code { text-align: center; font-size: 14px; margin-bottom: 5px; }
    .receipt-date { text-align: center; font-size: 14px; margin-bottom: 30px; font-style: italic; }
    .content { margin: 30px 0; }
    .row { display: flex; margin-bottom: 15px; font-size: 15px; line-height: 1.8; }
    .row-label { width: 200px; }
    .row-value { flex: 1; border-bottom: 1px dotted #666; min-height: 24px; }
    .row-value.no-border { border-bottom: none; }
    .amount-row { margin: 20px 0; padding: 15px; background-color: #f0f9ff; border: 2px solid #1e40af; }
    .amount-label { font-size: 15px; margin-bottom: 8px; }
    .amount-value { font-size: 22px; font-weight: bold; color: #1e40af; }
    .amount-words { font-size: 14px; font-style: italic; margin-top: 8px; color: #666; }
    .signature-section { margin-top: 60px; display: flex; justify-content: space-around; }
    .signature-box { text-align: center; width: 180px; }
    .signature-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; }
    .signature-subtitle { font-size: 12px; font-style: italic; color: #666; margin-bottom: 50px; }
    .signature-name { font-size: 14px; }
    .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #666; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company.company_name || 'CÔNG TY'}</div>
    <div class="company-info">
      ${company.address ? `${company.address}<br>` : ''}
      ${company.phone ? `ĐT: ${company.phone}` : ''} ${company.email ? `| Email: ${company.email}` : ''}
      ${company.tax_code ? `<br>MST: ${company.tax_code}` : ''}
    </div>
  </div>

  <div class="title">${title}</div>
  <div class="receipt-code">Số: <strong>${paymentCode}</strong></div>
  <div class="receipt-date">Ngày ${new Date(paymentDate).getDate()} tháng ${new Date(paymentDate).getMonth() + 1} năm ${new Date(paymentDate).getFullYear()}</div>

  <div class="content">
    <div class="row">
      <div class="row-label">${partnerLabel}:</div>
      <div class="row-value no-border"><strong>${partner.name} (${partner.code})</strong></div>
    </div>

    ${partner.phone ? `
    <div class="row">
      <div class="row-label">Điện thoại:</div>
      <div class="row-value no-border">${partner.phone}</div>
    </div>` : ''}

    ${partner.address ? `
    <div class="row">
      <div class="row-label">Địa chỉ:</div>
      <div class="row-value no-border">${partner.address}</div>
    </div>` : ''}

    <div class="row">
      <div class="row-label">Lý do ${isReceipt ? 'thu' : 'chi'}:</div>
      <div class="row-value no-border">Thanh toán công nợ</div>
    </div>

    ${notes ? `
    <div class="row">
      <div class="row-label">Ghi chú:</div>
      <div class="row-value no-border">${notes}</div>
    </div>` : ''}

    <div class="amount-row">
      <div class="amount-label">Số tiền thanh toán:</div>
      <div class="amount-value">${paymentAmount.toLocaleString('vi-VN')} đồng</div>
      <div class="amount-words" id="amount-words"></div>
    </div>

    <div class="row">
      <div class="row-label">Phương thức thanh toán:</div>
      <div class="row-value no-border"><strong>${paymentMethodMap[paymentMethod] || paymentMethod}</strong></div>
    </div>

    ${bankAccount ? `
    <div class="row">
      <div class="row-label">Tài khoản ngân hàng:</div>
      <div class="row-value no-border">${bankAccount.bank_name} - ${bankAccount.account_number}</div>
    </div>
    ${bankAccount.branch_name ? `
    <div class="row">
      <div class="row-label">Chi nhánh ngân hàng:</div>
      <div class="row-value no-border">${bankAccount.branch_name}</div>
    </div>` : ''}
    ` : ''}
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Người lập phiếu</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name"></div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Kế toán</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name"></div>
    </div>
    <div class="signature-box">
      <div class="signature-title">${partnerLabel}</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name">${partner.name}</div>
    </div>
  </div>

  <div class="footer">
    In lúc: ${new Date().toLocaleString('vi-VN')}
  </div>

  <script>
    function numberToVietnameseWords(num) {
      if (num === 0) return 'Không đồng';
      
      const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
      const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
      const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
      const thousands = ['', 'nghìn', 'triệu', 'tỷ'];
      
      function convertThreeDigits(n) {
        let result = '';
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        
        if (hundred > 0) {
          result += ones[hundred] + ' trăm';
          if (remainder > 0) result += ' ';
        }
        
        if (remainder >= 10 && remainder < 20) {
          result += teens[remainder - 10];
        } else {
          const ten = Math.floor(remainder / 10);
          const one = remainder % 10;
          
          if (ten > 0) {
            result += tens[ten];
            if (one > 0) result += ' ';
          }
          
          if (one > 0) {
            if (ten > 1 && one === 1) {
              result += 'mốt';
            } else if (ten > 0 && one === 5) {
              result += 'lăm';
            } else {
              result += ones[one];
            }
          }
        }
        
        return result;
      }
      
      let result = '';
      let unitIndex = 0;
      
      while (num > 0) {
        const threeDigits = num % 1000;
        if (threeDigits > 0) {
          const converted = convertThreeDigits(threeDigits);
          result = converted + (thousands[unitIndex] ? ' ' + thousands[unitIndex] : '') + (result ? ' ' + result : '');
        }
        num = Math.floor(num / 1000);
        unitIndex++;
      }
      
      return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
    }

    window.onload = function() {
      const amountWords = numberToVietnameseWords(${paymentAmount});
      document.getElementById('amount-words').textContent = '(Bằng chữ: ' + amountWords + ')';
      window.print();
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Generate PDF error:', error);
    return new NextResponse('Lỗi server', { status: 500 });
  }
}
