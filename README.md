# Bông iu

Ứng dụng quản lý cuộc sống và tài chính cá nhân bằng tiếng Việt. Giao diện tĩnh không cần bước build; chạy `index.html` qua một máy chủ HTTP để xem thử.

## Cấu hình đồng bộ

1. Tạo dự án Supabase và chạy `schema.sql` trong SQL Editor.
2. Điền Project URL và publishable/anon key vào `config.js`. Không dùng service-role key trong trình duyệt.
3. Bật Email authentication trong Supabase. Ứng dụng dùng email/password và dữ liệu riêng từng tài khoản theo RLS.
4. Deploy thư mục này lên Vercel dưới dạng static site. `vercel.json` đã cấu hình.

Khi chưa cấu hình Supabase, ứng dụng chạy chế độ dùng thử trên thiết bị, lưu bằng localStorage. Màn hình hiển thị rõ chế độ này. Không có đồng bộ nhiều thiết bị trong chế độ dùng thử.

## Các luồng chính

Lịch và việc cần làm dùng cùng một bản ghi. Thu chi tự cập nhật ngân sách và báo cáo. Chuyển tiền vào hũ tiết kiệm và khoản vay được theo dõi riêng, không tính thành chi tiêu sinh hoạt. Các khoản bắt buộc được tính riêng để tránh trừ hai lần. Dữ liệu được lưu sau mỗi thay đổi; ở chế độ Supabase, tab đang mở kiểm tra bản cập nhật từ thiết bị khác định kỳ.
