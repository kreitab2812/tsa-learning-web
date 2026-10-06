# Quiz Builder — Phase 3

- Câu hỏi giữ ba loại: trắc nghiệm A–D, nhóm Đúng/Sai, trả lời ngắn. Nhân bản thêm vào cuối bài; nút lên/xuống lưu ngay và có thể di chuyển qua ranh giới phân trang.
- Đề, lựa chọn và lời giải dùng Markdown: đậm/nghiêng, danh sách, bảng, `$LaTeX$`, `$$LaTeX$$`, ảnh `![mô tả](https://...)`. Thanh công cụ có chèn ảnh bằng link hoặc bộ upload ảnh hiện có. Không cần migration: lưu trong các trường văn bản hiện tại, tương thích nội dung cũ.
- `QuizContent` là bộ hiển thị chung cho Admin, màn duyệt nhập, Preview và học viên. Không chạy HTML thô; chỉ cho phép link/ảnh HTTP(S), KaTeX không bật trust.
- Mẫu tải trong mục Bài tập → Nhập nhanh. XLSX có đúng một sheet `Questions`, CSV UTF-8; tối đa 100 câu, tệp 1 MB. Không nhập công thức Excel/cached results; công thức Toán viết bằng LaTeX. Với mẫu bảng, nhóm Đúng/Sai gồm 4 mệnh đề và `trueFalse` là bốn boolean ngăn bởi dấu phẩy. JSON vẫn hỗ trợ nhóm từ 1 đến 20 mệnh đề.
- Nhập Excel/CSV/JSON chỉ tạo bản xem trước, không ghi DB. Dòng lỗi, cột lạ, câu trùng trong tệp đều hiện rõ và chặn lưu cả lô. Admin sửa nguồn, xem lại rồi đánh dấu duyệt. Máy chủ xác thực lại toàn bộ và lưu trong một transaction. Nếu kết nối mất lúc ghi, kiểm tra danh sách trước khi nhập lại; chưa có cơ chế idempotency giữa nhiều lần nhập riêng biệt.
- AI ở bên ngoài: sao chép hướng dẫn có sẵn, gửi đề cho AI, dán JSON trả về. Website không gọi AI hay tự suy đoán/sửa đáp án.
- API học viên chỉ trả đề và lựa chọn, không `correctAnswer`, `isTrue`, `explanation`. Lời giải (kể cả URL ảnh) chỉ trả sau SUBMIT được máy chủ cho phép. PDF đáp án gốc bị ẩn trước lần nộp đầu, kể cả đường tải trực tiếp; Admin Edit vẫn có quyền quản lý. Preview không kế thừa quyền xem đáp án của học viên thật; bài nộp Preview không ghi lịch sử thật.
- Cấu hình đảo câu/đáp án, thời gian và điểm đạt tiếp tục lưu cùng bài học. Áp dụng cấu hình trong phiên làm bài, bộ đếm giờ và luật hoàn thành thuộc Phase 4, không triển khai ở đây.

## Kiểm thử thủ công

1. Soạn đủ ba loại, chèn công thức/bảng/ảnh vào đề, đáp án, lời giải; đối chiếu xem trước và trang học.
2. Nhân bản, đưa câu lên/xuống qua ranh giới trang; tải lại và kiểm tra vị trí.
3. Tải mẫu Excel/CSV, thay câu ví dụ; kiểm tra nhưng chưa duyệt phải chưa có bản ghi. Thử một dòng thiếu đáp án và một dòng trùng: cả lô phải bị chặn.
4. Duyệt lô hợp lệ, kiểm tra đủ số câu; nhập JSON từ AI qua cùng quy trình.
5. Với học viên chưa nộp, kiểm tra response trang/API không chứa đáp án/lời giải/URL ảnh lời giải/PDF đáp án. Nộp xong mới thấy chúng. Preview không tạo attempt thật.
