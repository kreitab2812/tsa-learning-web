# Không gian Cụm kiến thức

- Ba view dùng chung môn/cụm: Chỉnh sửa, Xem như học viên, Tiến trình & sức khỏe. URL giữ môn/cụm; trạng thái mở card và vị trí cuộn của Admin được nhớ trong tab.
- Tìm tên cụm, mô tả hoặc bài học; lọc Nháp/Đã xuất bản; mở hoặc thu gọn tất cả. Bản sửa card có cảnh báo khi đóng tab, bấm liên kết hoặc đổi môn trong ứng dụng.
- Nút lên/xuống và kéo tay nắm đều chỉ đổi thứ tự tạm trong cùng nhóm. Lưu thứ tự mới ghi database; Hủy bỏ phục hồi bản gốc. Không chuyển bài sang cụm khác.
- Hoàn thành bài do học viên đánh dấu thủ công; điểm bài tập tách riêng. Khóa tuần tự ở cấp cụm/giai đoạn, không khóa từng bài trong cùng cụm.
- Preview mặc định ẩn bản nháp. Admin có thể bật xem thêm bản nháp, Magic Unlock và mô phỏng hoàn thành (tối đa 200 bài trong môn). Mô phỏng nằm trong URL của Preview; Đặt lại mô phỏng hoặc thoát bỏ trạng thái này. Máy chủ từ chối tham số mô phỏng từ học viên.
- Tiến độ tính toàn thời gian trên bài đã xuất bản trong khóa đã mở, kể cả bài đang khóa theo lịch/thứ tự, nhưng loại toàn bộ nhánh có tổ tiên nháp. Cụm cha bao gồm bài trong cụm con, không cộng các cụm để suy ra tổng môn.
- Điểm, bài tập đã làm, hoạt động và lỗi lọc theo môn/cụm và 7/30/90 ngày hoặc toàn lịch sử. Mỗi trang 20 bản ghi; tổng lần làm là toàn phạm vi. Biểu đồ hiển thị 30 lần gần nhất; bài tập PDF chưa có chấm điểm tự động.
- Quét link: 20 link/lượt, 4 đồng thời, ưu tiên chưa quét/cũ nhất, chờ 60 giây giữa hai lượt trên toàn hệ thống. Bộ đếm dùng bảng expiry hiện có với khóa riêng `health:link-scan`; không ảnh hưởng bộ đếm đăng nhập. Quét lại từng link và dẫn tới đúng tab sửa bài.
- Truy cập được chỉ xác nhận HTTP thành công. HTTP 401/403/429 hoặc địa chỉ nội bộ thuộc nhóm cần kiểm tra quyền/giới hạn; không bảo đảm video phát được hay file đúng nội dung.
- Logs gộp theo bài/loại/nội dung/URL; báo trùng trong một phút được bỏ qua. Lỗi nộp bài phía máy chủ ghi thông báo an toàn nếu database còn truy cập được. Báo lỗi mất mạng được giữ tối đa 5 mục trong bộ nhớ của màn bài học và thử lại khi online hoặc mỗi phút; rời màn hình sẽ mất hàng đợi. Không tự nộp lại bài tập.

Kiểm tra tập trung: `knowledge-workspace`, `subject-order`, `learning-validation`, `analytics-health` (unit); `learning-experience`, `analytics-health` (integration, chỉ database test).
