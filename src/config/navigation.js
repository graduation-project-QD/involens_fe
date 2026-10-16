import {
  Activity,
  CircleAlert,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  List,
  Sheet,
  Upload,
  Users,
} from 'lucide-react'

// Desktop and mobile share this navigation configuration.
export const navigation = [
  {
    label: 'Tổng quan',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Tài liệu',
    items: [
      { label: 'Tải lên', to: '/upload', icon: Upload },
      { label: 'Danh sách tài liệu', to: '/documents', icon: List },
      { label: 'Hàng đợi duyệt', to: '/approvals', icon: Clock3 },
      { label: 'Tài liệu lỗi', to: '/errors', icon: CircleAlert },
      { label: 'Hóa đơn đã trích xuất', to: '/invoices', icon: ClipboardList },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { label: 'Nhật ký thao tác', to: '/activity', icon: Activity },
      { label: 'Xuất dữ liệu', to: '/export', icon: Sheet },
      {
        label: 'Quản lý tài khoản',
        to: '/accounts',
        icon: Users,
        managerOnly: true,
      },
    ],
  },
]
