# Involens FE

React + Vite + Tailwind CSS. Giao diện đăng nhập và dashboard theo thiết kế.

## Chạy dự án

```powershell
$env:Path = "$PWD\.tools\node-v24.21.0-win-x64;$env:Path"
npm.cmd install
npm.cmd run dev
```

Nếu đã cài Node.js 24 LTS trên máy, không cần dòng thiết lập Path.

- `/login`: đăng nhập mẫu; nhập email hợp lệ và mật khẩu bất kỳ để xem dashboard.
- `/dashboard`: tổng quan theo ảnh thiết kế.
- `npm run build`: tạo bản production trong `dist/`.
- `npm run preview`: xem bản build.
- `npm run format`: định dạng code.

## Cấu trúc tái sử dụng

```text
src/
  components/
    navigation/Sidebar.jsx     # Sidenav desktop và mobile
    ui/                       # Button, PageHeader, StatusBadge
    dashboard/                # StatsGrid, ActivityChart
    documents/                # DocumentsTable
  config/navigation.js        # Nhóm menu, icon, đường dẫn, số lượng
  data/dashboard.js           # Dữ liệu mẫu, thay bằng API sau
  layouts/DashboardLayout.jsx # Sidebar + vùng nội dung Outlet
  pages/                      # LoginPage, DashboardPage, WorkspacePage
  App.jsx                     # Cấu hình routes
  index.css                   # Tailwind theme và style chung
```

### Thêm một trang sử dụng sidebar

1. Tạo component trang trong `src/pages/`.
2. Thêm `Route` bên trong route có `element={<DashboardLayout />}` ở `src/App.jsx`.
3. Thêm mục tương ứng vào `src/config/navigation.js`.

Layout giữ sidebar khi đổi trang. NavLink tự đánh dấu trang hiện tại.
Các component thống kê, biểu đồ và bảng nhận dữ liệu qua props.
Màu `brand`, `sidebar` được định nghĩa tập trung bằng `@theme` trong `src/index.css`.

## Phạm vi hiện tại

Đây là frontend demo, chưa có xác thực/API. Nút đăng nhập chuyển trang; không xác minh hoặc lưu mật khẩu. Dashboard dùng dữ liệu mẫu theo ảnh, các tổng số không suy ra từ bốn tài liệu mẫu. Các menu phụ là trang khung dùng lại layout, có lọc dữ liệu mẫu theo trạng thái. Trang tải lên chỉ chọn và kiểm tra tệp cục bộ; chưa gửi tệp lên máy chủ.

Khi tích hợp backend, bổ sung xác thực, bảo vệ route, API tài liệu và trạng thái loading/error. Khi deploy SPA, cấu hình hosting fallback về `index.html` để mở trực tiếp các route.
