import {
  CircleAlert,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  List,
  Sheet,
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
      { label: 'Tất cả tài liệu', to: '/documents', icon: List },
      { label: 'Chờ duyệt', to: '/approvals', icon: Clock3 },
      { label: 'Tài liệu lỗi', to: '/errors', icon: CircleAlert },
      { label: 'Hóa đơn đã xử lý', to: '/invoices', icon: ClipboardList },
    ],
  },
  {
    label: 'Dữ liệu',
    items: [{ label: 'Xuất dữ liệu', to: '/export', icon: Sheet }],
  },
  {
    label: 'Hệ thống',
    managerOnly: true,
    items: [
      {
        label: 'Quản lý tài khoản',
        to: '/accounts',
        icon: Users,
        managerOnly: true,
      },
    ],
  },
]
