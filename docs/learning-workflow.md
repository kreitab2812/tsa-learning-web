# Phase 4 — Luồng học và phiên làm bài

## Học và tiếp tục

- Bốn bước Lý thuyết, Thực hành, Tài liệu, Bài tập dùng một màn học chung cho học viên và Preview. Bước hiện tại và xác nhận hoàn thành lưu trên máy chủ. Bước không có nội dung vẫn có nút tiếp tục.
- `FREE` cho chọn bước tự do, `SEQUENTIAL` yêu cầu hoàn thành các bước trước. Quyền đọc tài liệu và tải xuống được kiểm tra theo bước, không chỉ khóa nút ở trình duyệt.
- `MANUAL` cho tự hoàn thành sau ba bước nội dung (nếu đã mở một phiên thì cần nộp phiên đó). `QUIZ_SUBMITTED` cần một lần nộp; `QUIZ_PASSED` cần một lần đạt ngưỡng của phiên. Hoàn thành không bị thu hồi vì lần làm lại có điểm thấp hơn.
- Cờ `requireCompletionForNext` của bài trước chặn bài sau trong cùng cụm; các quy tắc cụm/giai đoạn hiện có vẫn giữ nguyên.

## Phiên và lịch sử

- `START` có UUID chống tạo lại khi thử gửi lại. Mỗi tài khoản/bài/chế độ chỉ có một phiên đang mở.
- `QuizSession.snapshot` giữ đề, ảnh, lời giải, khóa đáp án, thứ tự câu/lựa chọn và các cấu hình tại lúc bắt đầu. Không trỏ về câu hỏi đang được Admin sửa. Lựa chọn giữ ID gốc khi xáo thứ tự.
- Đồng hồ dùng `deadlineAt` của máy chủ, không gia hạn khi tải lại, rời trang hoặc đổi bước. Lượt làm tính từ lúc tạo phiên, kể cả bỏ dở. Bản ghi cũ trước Phase 4 được giữ nguyên và được tính vào giới hạn; không tự dựng lại bản chụp lịch sử không có dữ liệu.
- Lưu nháp dùng revision để từ chối ghi đè từ tab cũ. `SUBMIT` và tự thu bài cùng một transaction với kết quả, hoạt động và tiến trình; `ExerciseAttempt.sessionId` là unique. Gửi lại cùng phiên không tạo kết quả thứ hai.
- API không gửi khóa đáp án/lời giải của snapshot trước khi phiên được nộp. Kết quả và đề của phiên gần nhất được phục hồi khi quay lại; lịch sử các phiên trước vẫn lưu trong DB, chưa thêm màn phân tích mới.

## Mất mạng và hết giờ

- Bản nháp tự gửi sau khi ngừng sửa khoảng 1,5 giây. Trình duyệt giữ bản dự phòng theo tài khoản/bài/chế độ/phiên, báo rõ bản chưa được máy chủ xác nhận. Không có đảm bảo lưu offline nếu trình duyệt chặn/xóa storage.
- Khôi phục nếu revision phù hợp. Nếu khác bản trên máy chủ, người học chọn bản muốn giữ; không âm thầm ghi đè.
- Sau hạn chỉ chấm bản nháp máy chủ đã nhận; không tin timestamp từ trình duyệt và không nhận bài sửa gửi muộn. Hết giờ vẫn khóa chỉnh sửa trên UI khi offline. Khi kết nối lại, đồng bộ để nhận kết quả; nộp lại cùng phiên an toàn nếu phản hồi trước bị mất.
- Không thêm cron/dịch vụ trả phí. Hết hạn được chốt khi máy chủ nhận thao tác tiếp theo (trang đang mở tự đồng bộ khi hết giờ; quay lại trang cũng đồng bộ). Nếu đóng mọi tab, kết quả có thể chưa xuất hiện trong Analytics cho đến lần đồng bộ tiếp theo. Quyền truy cập vẫn được kiểm tra, kể cả phiên đã mở.
- Nguồn YouTube/Drive bên ngoài không thể thu hồi đường dẫn đã công khai hoặc đã gửi cho người có quyền trước đó.

## Preview

- Chỉ Admin có quyền dùng Preview/Magic Unlock. `LessonRun`/`QuizSession` Preview gắn Admin, có cờ riêng, lưu được qua tải lại nhưng không tạo `Progress`, `ExerciseAttempt` hay `LearningActivity` thật.
- Nút “Đặt lại bài Preview” chỉ xóa các phiên mô phỏng của Admin trong bài đó và đặt lại bước mô phỏng. Không xóa lịch sử học viên. Nút tắt mở khóa tạm thời chỉ bỏ trạng thái URL/Magic Unlock, không xóa phiên.

## Triển khai và kiểm thử

- Migration duy nhất: `20260926000000_learning_sessions`, chỉ thêm bảng/cột/index. Cần tạo lại Prisma Client và khởi động lại tiến trình dev/server đang chạy sau migration để không giữ client cũ.
- Kiểm thử phạm vi: mở sai bước, vượt quyền, tải lại giữ hạn và thứ tự, bản nháp cũ/xung đột, sửa/xóa câu nguồn, nộp đồng thời/lặp, gửi muộn, giới hạn lượt và Preview không ghi tiến trình thật.
- Kiểm thử trình duyệt nên thử thêm hai tab, tắt mạng, tải lại, hết giờ và mở lại trang trên tài khoản học viên; không dùng dữ liệu Preview để kết luận quyền học viên thật.
