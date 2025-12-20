'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { ArrowLeftOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import { DatePicker, Select } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const { RangePicker } = DatePicker;

interface BankAccount {
    id: number;
    accountNumber: string;
    accountHolder: string;
    bankName: string;
    branchName?: string;
    balance: number;
    isActive: boolean;
    companyBranchName: string;
    branchId: number;
    createdAt: string;
    accountType?: 'BANK' | 'CASH';
}

interface Transaction {
    id: number;
    transactionCode: string;
    transactionDate: string;
    amount: number;
    transactionType: 'THU' | 'CHI';
    paymentMethod: string;
    description: string;
    categoryName: string;
    createdByName: string;
    createdAt: string;
}

export default function BankAccountDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { can, loading: permLoading } = usePermissions();
    const [account, setAccount] = useState<BankAccount | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTx, setLoadingTx] = useState(true);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
        dayjs().subtract(3, 'month'),
        dayjs(),
    ]);
    const [filterType, setFilterType] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (params.id) {
            fetchAccount();
        }
    }, [params.id]);

    useEffect(() => {
        if (params.id) {
            fetchTransactions();
        }
    }, [params.id, dateRange, filterType]);

    const fetchAccount = async () => {
        try {
            const res = await fetch(`/api/finance/bank-accounts/${params.id}`);
            const data = await res.json();
            if (data.success) {
                setAccount(data.data);
            }
        } catch (error) {
            console.error('Error fetching account:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        setLoadingTx(true);
        try {
            const startDate = dateRange[0].format('YYYY-MM-DD');
            const endDate = dateRange[1].format('YYYY-MM-DD');
            let url = `/api/finance/bank-accounts/${params.id}/transactions?startDate=${startDate}&endDate=${endDate}`;
            if (filterType) {
                url += `&type=${filterType}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setTransactions(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoadingTx(false);
        }
    };

    if (loading || permLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="text-6xl mb-4">🔍</div>
                <div className="text-xl text-gray-600">Không tìm thấy tài khoản</div>
                <button
                    onClick={() => router.push('/finance/bank-accounts')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const isCash = account.accountType === 'CASH' || account.bankName === 'Tiền mặt';

    const totalThu = transactions
        .filter(t => t.transactionType === 'THU')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalChi = transactions
        .filter(t => t.transactionType === 'CHI')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    return (
        <WrapperContent
            title=""
            isNotAccessible={!can('finance.cashbooks', 'view')}
            isLoading={loading}
            header={{
                customToolbar: (
                    <div className="flex gap-2 items-center flex-nowrap">
                        <button
                            onClick={() => router.push('/finance/bank-accounts')}
                            className="flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"
                        >
                            <ArrowLeftOutlined /> Quay lại
                        </button>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setDateRange([dates[0], dates[1]]);
                                }
                            }}
                            format="DD/MM/YYYY"
                            placeholder={['Từ ngày', 'Đến ngày']}
                            size="middle"
                            style={{ width: 230 }}
                            suffixIcon={<CalendarOutlined />}
                            presets={[
                                { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
                                { label: '3 tháng', value: [dayjs().subtract(3, 'month'), dayjs()] },
                                { label: '6 tháng', value: [dayjs().subtract(6, 'month'), dayjs()] },
                                { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs()] },
                            ]}
                        />
                        <Select
                            style={{ width: 100 }}
                            placeholder="Loại"
                            allowClear
                            size="middle"
                            value={filterType}
                            onChange={(value) => setFilterType(value)}
                            options={[
                                { label: 'Thu', value: 'THU' },
                                { label: 'Chi', value: 'CHI' },
                            ]}
                        />
                    </div>
                ),
                buttonEnds: [
                    {
                        type: 'default',
                        name: 'Làm mới',
                        onClick: () => {
                            fetchAccount();
                            fetchTransactions();
                        },
                        icon: <ReloadOutlined />,
                    },
                ],
            }}
        >
            <div className="space-y-4">
                {/* Header thông tin tài khoản */}
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${isCash ? 'bg-green-100' : 'bg-blue-100'}`}>
                                {isCash ? '💵' : '🏦'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-gray-800">{account.accountNumber}</h1>
                                    <span className={`px-2 py-0.5 rounded text-xs ${account.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {account.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                    </span>
                                </div>
                                <div className="text-gray-500 text-sm">
                                    {account.accountHolder} • {isCash ? 'Quỹ tiền mặt' : account.bankName}
                                    {account.companyBranchName && ` • ${account.companyBranchName}`}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Số dư hiện tại</div>
                            <div className={`text-2xl font-bold ${account.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(account.balance)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thống kê */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <div className="text-sm text-green-600">Tổng thu</div>
                        <div className="text-xl font-bold text-green-700">{formatCurrency(totalThu)}</div>
                        <div className="text-xs text-green-500 mt-1">{transactions.filter(t => t.transactionType === 'THU').length} giao dịch</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <div className="text-sm text-red-600">Tổng chi</div>
                        <div className="text-xl font-bold text-red-700">{formatCurrency(totalChi)}</div>
                        <div className="text-xs text-red-500 mt-1">{transactions.filter(t => t.transactionType === 'CHI').length} giao dịch</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="text-sm text-blue-600">Chênh lệch</div>
                        <div className={`text-xl font-bold ${totalThu - totalChi >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                            {formatCurrency(totalThu - totalChi)}
                        </div>
                        <div className="text-xs text-blue-500 mt-1">Trong kỳ đã chọn</div>
                    </div>
                </div>

                {/* Bảng giao dịch */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                        <div className="font-medium text-gray-700">Lịch sử giao dịch</div>
                        <div className="text-sm text-gray-500">
                            {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')} • {transactions.length} giao dịch
                        </div>
                    </div>

                    {loadingTx ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">📭</div>
                            <div>Không có giao dịch nào</div>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Mã GD</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Ngày</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Loại</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">Số tiền</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Danh mục</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Mô tả</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Người tạo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{tx.transactionCode}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${tx.transactionType === 'THU'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {tx.transactionType}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${tx.transactionType === 'THU' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {tx.transactionType === 'THU' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{tx.categoryName}</td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                                            {tx.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{tx.createdByName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </WrapperContent>
    );
}
