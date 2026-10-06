# Google Drive — kết nối upload của Phase 2

## Thiết lập một lần

1. Trong Google Cloud Console, tạo/chọn project và bật **Google Drive API**. Không cần bật tính năng AI hay dịch vụ thanh toán cho luồng này.
2. Cấu hình OAuth consent, thêm tài khoản Admin vào Test users nếu ứng dụng còn ở trạng thái Testing. Tạo OAuth Client loại **Web application**.
3. Thêm Authorized redirect URI khớp chính xác `http://localhost:3000/api/admin/drive/callback` khi chạy local. Khi triển khai, dùng `https://TEN-MIEN/api/admin/drive/callback`; origin phải khớp `APP_ORIGIN`. Không trộn localhost với 127.0.0.1.
4. Điền `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI` trong `.env` hoặc cấu hình máy chủ. Không dùng tiền tố NEXT_PUBLIC, không gửi secret vào chat hoặc đưa lên Git.
5. Tạo khóa mã hóa 32 byte bằng lệnh bên dưới rồi điền `GOOGLE_DRIVE_TOKEN_KEY`. Giữ khóa cố định và sao lưu an toàn: đổi/mất khóa sẽ cần kết nối Drive lại.

```sh
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

6. Sau migration và `npm run db:generate`, khởi động lại server. Vào Bài học → Tài liệu → **Kết nối Drive** và đồng ý quyền Google yêu cầu. Nếu bị hủy/từ chối, web báo chưa kết nối và cho thử lại.
7. Tải một PDF nhỏ. Tệp nằm trong My Drive của tài khoản vừa kết nối. Web không tự tạo quyền công khai hoặc gửi email: mở tệp trên Drive, chia sẻ quyền xem với tài khoản Google của học viên, rồi kiểm tra bằng chính tài khoản đó.

## Quyền và giới hạn

- Dùng scope `drive.file`: chỉ quản lý những tệp ứng dụng được cấp quyền, không xin đọc toàn bộ Drive. OAuth có state, PKCE, cookie HttpOnly hết hạn 10 phút gắn với Admin đang đăng nhập. Refresh token được mã hóa AES-256-GCM trong database; không trả về trình duyệt.
- Upload chỉ dành Admin, kiểm tra cùng origin; 1 upload đồng thời/Admin, tối đa **4 MB/tệp**, tối đa **100 tài liệu/bài**. Kiểm tra đuôi và chữ ký cơ bản của PDF/DOC/DOCX/ZIP trên máy chủ, kể cả khi thiếu Content-Length. Không giải nén ZIP, không nhận executable; đây không phải bộ quét virus.
- PDF được nhúng; Word/ZIP chỉ là tệp đính kèm. Link có sẵn do Admin chọn loại; không giả định đã xác minh MIME/dung lượng hay quyền Drive của link đó.
- Dung lượng Drive của tài khoản và giới hạn request/thời gian của hosting vẫn áp dụng. Upload không tự thử lại nếu mất kết nối vì có thể gây tệp trùng. Kiểm tra Drive trước khi gửi lại.
- Nếu Drive đã tạo tệp nhưng ghi database thất bại, LMS cố chuyển **chính tệp mới đó** vào thùng rác (khôi phục được). Nếu không làm được, thông báo hướng dẫn thêm link thủ công. Tệp có sẵn không bị xóa.
- Gỡ tài liệu khỏi bài chỉ bỏ liên kết LMS. Ngắt kết nối chỉ xóa token đã lưu trong LMS, không xóa tệp và không thu hồi mọi quyền trong Google; có thể thu hồi quyền app ở tài khoản Google nếu cần.
- Tài khoản Google đang Testing hoặc quyền bị thu hồi có thể cần kết nối lại. Xem thời hạn trong cấu hình Google, không coi kết nối là vĩnh viễn.

## Mức bảo vệ đã thống nhất

- Máy chủ kiểm tra tài khoản, bài bị khóa và tùy chọn tải trước khi cấp liên kết tải qua LMS. Nội dung của bài bị khóa không được gửi trong payload học viên.
- Google Drive kiểm tra quyền riêng khi mở iframe/link; việc có quyền trong LMS không tự cấp quyền Google. Tệp chia sẻ công khai vẫn có thể truy cập ngoài LMS.
- Tắt tải trong LMS không điều khiển nút tải/print/pop-out bên trong iframe Google. Chủ tệp phải cấu hình hạn chế tải trên Drive.
- Watermark email là lớp phủ trên khung LMS, không được nhúng vào PDF gốc; khi mở nguồn hoặc tải tệp lớp phủ không còn. Preview dùng email Admin đang xem. Không bảo đảm chống chụp ảnh/quay màn hình.
- Sự kiện iframe tải xong không chứng minh video/PDF hoạt động: lỗi quyền/xóa tệp có thể hiện trong iframe từ Google. UI có chờ tải, thông báo chậm sau 15 giây, thử lại, mở nguồn và báo lỗi thủ công. Không đọc nội dung iframe khác origin và không ghi nhận tải thành công giả.

Nguồn chính thức: [OAuth Web Server](https://developers.google.com/identity/protocols/oauth2/web-server), [Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [drive.file scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [quyền chia sẻ](https://support.google.com/drive/answer/2494822).
