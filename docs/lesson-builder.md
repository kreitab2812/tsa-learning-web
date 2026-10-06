# Bài học — Phase 1

## Phase 2 — Video và tài liệu

- Admin Edit và màn học/Preview dùng chung `LessonMediaView`, `MediaFrame`, `DocumentLibrary`: video YouTube + PDF Drive cạnh nhau, kéo vách (25–75%, hỗ trợ bàn phím), ẩn một bên, PDF-only. Trên điện thoại dùng nút Chỉ Video/Chỉ PDF; ẩn video không dừng âm thanh.
- Document Hub thêm link hoặc upload PDF/Word/ZIP lên Drive. Upload và tùy chọn tài liệu lưu ngay, độc lập với thanh lưu bản sửa của bài. Tài liệu gắn THEORY/PRACTICE thay PDF đi kèm bước đó; thư viện nhận nhiều tệp.
- Tải xuống đi qua route xác thực và kiểm tra khóa/quyền ở server; Word/ZIP không xây viewer riêng. Watermark chỉ là lớp phủ LMS như đã thống nhất. Không thay đổi quy tắc hoàn thành, Quiz Builder hay Analytics.
- Cần migration `20260919000000_lesson_media`, tạo lại Prisma Client và khởi động lại dev server. Không reset dữ liệu, không cài dependency. Thiết lập OAuth theo [Google Drive](./google-drive.md).
- Kiểm thử thủ công: mở bài có YouTube/PDF, kéo và dùng phím mũi tên trên vách; chuyển Chỉ PDF/Chỉ Video; thử bước không có video; kiểm tra màn hẹp; thử link sai/Drive riêng tư. Trong Hub, thử upload >4 MB/đuôi sai, tắt tải, bật watermark và Preview; thử học viên truy cập bài khóa. Kiểm thử OAuth/upload thật cần cấu hình Google và chấp thuận của chủ tài khoản.

Các mục Phase 1 bên dưới ghi lại nền tảng ban đầu, không phải trạng thái viewer hiện tại.

## Phạm vi đã triển khai

- Giữ đường dẫn chỉnh sửa hiện tại `/dashboard/lessons/[lessonId]/questions`; `?tab=theory|practice|documents|questions` chọn bước và giữ đúng bước khi tải lại.
- Không gian soạn rộng thay sidebar quản trị bằng bốn bước. Các phần khác của Admin giữ nguyên.
- Sửa tên, video, các link tài liệu cũ và PDF Google Drive riêng cho Lý thuyết/Thực hành. Lưu từng bước hoặc lưu tất cả bản sửa; câu hỏi vẫn lưu bằng form riêng hiện có.
- Thanh lưu/hủy chung; lỗi hiển thị tại chỗ và giữ bản sửa. Cảnh báo đóng/tải lại tab hoặc bấm liên kết rời màn hình; chưa bảo vệ nút Back/Forward của trình duyệt. Không lưu nháp vào thiết bị.
- Cấu hình được lưu nhưng **chưa thực thi**: hoàn thành thủ công/nộp quiz/đạt điểm; điều hướng tự do/tuần tự; yêu cầu hoàn thành trước bài kế; thời gian, điểm đạt, số lần làm, đảo câu/đáp án. Ngưỡng điểm mang nghĩa >=. Mặc định thủ công, tự do, không khóa bài kế, không giới hạn thời gian/lần làm.

## Dữ liệu và tương thích

- Migration `20260918180000_lesson_builder_foundation` chỉ thêm trường/bảng. Không reset, không đổi câu hỏi, Progress hoặc ExerciseAttempt.
- `LessonAttachment` chuẩn bị danh sách tài liệu có thứ tự, vị trí THEORY/PRACTICE/DOCUMENTS và tùy chọn tải/watermark cho phase sau. Ba link tài liệu cũ được sao chép nguyên vẹn bằng migration, không tự đoán chúng đi kèm video nào.
- Năm trường URL tài liệu trên Lesson vẫn là nguồn ghi của các ô hiện có. Admin mutation đồng bộ attachment có `sourceKey` trong cùng transaction; xóa ô URL chỉ xóa bản ghi liên kết đó, không xóa tệp Google Drive. Attachment bổ sung không có sourceKey được giữ nguyên.
- Cấu hình tải/watermark trong bảng chỉ là nền dữ liệu, chưa có hiệu lực bảo vệ. Quyền Google Drive và khả năng nhúng cần kiểm tra ở Phase 2.
- Không cần dependency mới. Sau migration và `npm run db:generate`, khởi động lại dev server đang chạy để nhận Prisma Client mới.

## Để lại đúng phase

- Phase 2: nhúng YouTube và Google Drive PDF cạnh nhau, kéo vách chia, ẩn/hiện, hỗ trợ điện thoại và lỗi nguồn.
- Phase 3: Quiz Builder nâng cao, Excel/CSV và dữ liệu từ AI bên ngoài; không tích hợp AI API.
- Phase 4: áp dụng quy tắc linh hoạt ở máy chủ, tiến trình từng bước, phiên làm bài và Preview tương ứng.
- Phase 5: analytics riêng bài, tích hợp tệp mới vào Health. Liên kết hiện tại chỉ mở Preview cũ và Analytics cấp cụm, không giả lập tính năng chưa xây.

## Kiểm thử trực tiếp

1. Từ cụm, mở chỉnh sửa bài cũ; xác nhận video, ba link tài liệu và câu hỏi còn nguyên.
2. Sửa tên và PDF ở hai bước; chuyển bước rồi lưu một bước: bản sửa khác vẫn còn. Lưu bài học và tải lại để kiểm tra.
3. Thử Hủy thay đổi, URL sai và điểm ngoài 1–100: không mất bản sửa khi lưu lỗi; sửa hợp lệ rồi lưu lại.
4. Mở cài đặt, đổi giá trị rồi lưu/tải lại; thử để trống thời gian và số lần làm. Màn học hiện tại vẫn hoạt động theo quy tắc cũ.
5. Khi chưa lưu, bấm Trở về cụm/Preview hoặc tải lại để kiểm tra cảnh báo. Kiểm tra chiều rộng điện thoại và máy tính.
