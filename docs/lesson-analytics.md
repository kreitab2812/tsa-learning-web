# Phase 5 — Analytics theo bài

- Mở **Analytics bài học** từ Lesson Builder hoặc tên bài trong Health.
- Báo cáo chọn học viên STUDENT được tạo đầu tiên, giống Health. Tiến trình lấy từ LessonRun `preview=false`; không suy diễn bốn bước từ dấu hoàn thành cũ.
- Điểm lấy từ ExerciseAttempt thật, phân trang 20 lần. Câu sai dùng kết quả đã chấm + bản chụp của tối đa 200 lần làm gần nhất, không chấm lại đề hiện tại; hiển thị 20 phiên bản câu sai nhiều nhất. Câu bỏ trống tính sai. Lần cũ thiếu bản chụp không tham gia thống kê câu sai. Đảo thứ tự không tạo phiên bản mới; sửa đề/đáp án tạo phiên bản riêng.
- YouTube: IFrame Player API lấy mẫu đoạn phát liên tục mỗi giây, gửi theo lô 20 giây. Hợp các đoạn xem, không cộng lặp xem lại, bỏ mẫu tua/nhảy thời gian. API kiểm tra đăng nhập STUDENT, quyền bài/bước và ID video hiện tại. Admin/Preview không ghi mức xem thật. Mức xem chỉ là số đo ước tính từ trình duyệt, không chứng minh sự tập trung, không dùng chấm điểm/mở khóa.
- Không có dữ liệu thì hiển thị chưa ghi nhận; nguồn không hỗ trợ được ghi rõ. Thay video không kế thừa phần trăm video trước. Không đo xem ở ngoài web. Mất mạng giữ tối đa 1.200 mẫu trong bộ nhớ; đóng trang/mất kết nối có thể mất mẫu chưa gửi. Video trên 24 giờ không đo.
- PDF lý thuyết/thực hành và tệp PDF/Word/ZIP được đưa vào thư viện link, dùng chung giới hạn quét 20 link/lượt, nghỉ 60 giây và kiểm tra URL hiện có. Tệp mirror không bị đếm đôi. Health không sửa trực tiếp; dẫn về đúng tab hoặc thẻ tài liệu.
- Báo lỗi tài liệu/tải xuống dùng DOCUMENT_LOAD, video dùng VIDEO_LOAD, nộp bài dùng SUBMISSION. Endpoint từ chối Admin và URL không thuộc nội dung đã mở. Lỗi trong iframe khác nguồn không phải lúc nào cũng phát hiện tự động; giữ nút báo lỗi cho học viên.
- Migration: `20260926010000_lesson_video_analytics` thêm VideoWatch, không reset dữ liệu. Generate Prisma Client và khởi động lại máy chủ sau khi áp dụng.

Kiểm thử tay: học viên phát YouTube, tua và xem lại; chờ đồng bộ rồi xem Analytics. Thử Preview và xác nhận số liệu thật không đổi. Mở link sửa của PDF thực hành và tệp ZIP trong Health. Thử báo lỗi tải xuống và kiểm tra đúng loại/đúng bài.

Tham chiếu API: https://developers.google.com/youtube/iframe_api_reference
