# Bông iu — bản cập nhật cục bộ

Đây là bản sửa của website Bông iu hiện có, **không ghi vào ổ E** và không tự đẩy GitHub hoặc triển khai Vercel. Các file HTML/CSS/JS chạy trực tiếp trên Vercel, không cần bước build.

## Lưu dữ liệu

- Dữ liệu nghiệp vụ lưu trong IndexedDB bằng Dexie. Khi mở bản mới lần đầu trên **cùng URL và trình duyệt**, dữ liệu cũ trong localStorage được chuyển vào IndexedDB một lần.
- Nút **Sao lưu** tải JSON về máy. **Khôi phục** cho xem số lượng bản ghi trước khi thay dữ liệu hiện tại.
- Xóa dữ liệu trang web, dùng cửa sổ riêng tư hoặc đổi trình duyệt có thể làm mất dữ liệu cục bộ. Nên sao lưu thường xuyên.
- `dexie.min.js` được phân phối cùng giấy phép trong `DEXIE-LICENSE.txt`.

## Lịch dạy và lương

Long, Quyên, Trúc có đơn giá riêng. Gõ “Dạy Long”, “Dạy Quyên” hoặc “Dạy Trúc”, chọn ngày linh hoạt rồi thêm lịch. Buổi mới là **Đã lên lịch** và chưa tính tiền. Khi thực sự dạy xong, bấm **Đã dạy**; đơn giá lúc đó được giữ riêng trong buổi học. Buổi hủy/hoãn không tính lương.

Nhập số tiền thực nhận để ghi lương, kể cả khi chỉ nhận một phần. Tiền được phân bổ vào các buổi chưa thanh toán theo thứ tự ngày dạy; phần còn phải thu vẫn hiển thị. Khoản tiền nhận được ghi một lần vào Thu chi. Hủy phiếu lương sẽ đảo phần phân bổ và xóa khoản Thu liên quan, không xóa lịch sử buổi dạy.

## Cập nhật trên GitHub

Giải nén gói cập nhật rồi tải các file ở thư mục gốc lên repository `bongiu`: `app.js`, `improvements.js`, `index.html`, `storage.js`, `dexie.min.js`, `DEXIE-LICENSE.txt`, `README.md`. Giữ nguyên `styles.css` và các dữ liệu đã nhập trên website. Sau khi Vercel tự triển khai, kiểm tra một buổi lên lịch không được cộng lương, đánh dấu **Đã dạy** mới cộng, và thử sao lưu.

## Giới hạn hiện tại

Đây là bản sửa của ứng dụng HTML/JS hiện có, chưa phải bản React/TypeScript với 6 menu và toàn bộ các module trong tài liệu Bông iu 2.0. Chưa có tài khoản đăng nhập hoặc đồng bộ giữa thiết bị. Các file `config.js` và `schema.sql` từ bản cũ không còn được website sử dụng.
