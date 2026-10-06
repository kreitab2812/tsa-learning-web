# Triển khai Vercel — TSA Learning Web

## Cấu hình đã chuẩn bị

- Repository đã chọn: `kreitab2812/tsa-learning-web`. Không thay đổi quyền riêng tư của repository.
- Next.js chạy đầy đủ máy chủ, không dùng static export hoặc GitHub Pages.
- Node.js 22.x; cài bằng `npm ci`, build bằng `npm run build`.
- `postinstall` sinh Prisma Client; cần cấu hình DATABASE_URL trước khi build.
- Vercel Functions dùng `syd1`, cùng vùng Sydney với database hiện tại.
- Không tự chạy migration hoặc seed trong build. Không reset database.
- `.gitignore` và `.vercelignore` loại `.env`, `.local` và các tệp thông tin đăng nhập khỏi nguồn triển khai.

## Trước khi đưa lên

1. Xác nhận dự án Supabase hoạt động; xuất bản sao lưu database ở nơi riêng tư.
   Backup database không chứa nội dung tệp YouTube/Drive/Cloudinary: giữ các tệp gốc riêng.
2. Kiểm tra quyền repository, nguồn code chuẩn bị đẩy và không có secret trong Git.
3. Kiểm tra build, các lỗi bảo mật thư viện và phân quyền API. Không chạy integration test ghi dữ liệu trên database đang sử dụng.
4. Kết nối GitHub/Vercel bằng tài khoản chủ dự án. Dùng Hobby nếu đáp ứng điều kiện cá nhân, phi thương mại; không bật trial hay dịch vụ trả phí tự động.
5. Import repository hiện tại; xác nhận tên miền production được cấp thực tế trước khi cấu hình origin.

## Biến môi trường Vercel

Chỉ nhập giá trị thật trong cấu hình môi trường của Vercel, không ghi vào tài liệu/chat/Git.

| Biến | Cấu hình |
| --- | --- |
| DATABASE_URL | Chuỗi kết nối Supabase hiện tại, server-only. Không dùng tiền tố NEXT_PUBLIC. |
| APP_ORIGIN | Chính xác `https://<tên-miền-production>`, không có dấu `/` cuối. Thiếu biến sẽ chặn yêu cầu ghi; truy cập từ tên miền khác sẽ bị từ chối. |
| NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME | Chỉ cần nếu dùng upload ảnh Cloudinary. |
| NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET | Preset ảnh câu hỏi, phải giới hạn định dạng/dung lượng bên Cloudinary. |
| NEXT_PUBLIC_CLOUDINARY_COURSE_PRESET | Preset ảnh khóa học, cũng cần giới hạn ở Cloudinary. |
| GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET | Chỉ cần nếu upload Drive qua website. |
| GOOGLE_DRIVE_REDIRECT_URI | `https://<tên-miền-production>/api/admin/drive/callback`, đăng ký đúng URI này tại Google Cloud. |
| GOOGLE_DRIVE_TOKEN_KEY | Giữ nguyên khóa mã hóa khi dùng lại token Drive đã lưu; sao lưu khóa riêng. |

Không sao chép DATABASE_URL thật sang mọi bản Preview. Preview cần database riêng nếu dùng để sửa/thử dữ liệu.
Không nới lỏng kiểm tra APP_ORIGIN để chấp nhận tùy ý mọi địa chỉ Preview.
Nếu chưa cấu hình upload Drive/Cloudinary, vẫn có thể dùng link có sẵn; quyền xem trên Google Drive phải cấp riêng.

## Kiểm tra sau triển khai

- Trang đăng nhập mở qua HTTPS; không cần máy cá nhân chạy `npm run dev`.
- Chưa đăng nhập không đọc được API Admin hoặc nội dung bài học có bảo vệ.
- Admin đăng nhập, tải danh sách và lưu thay đổi có chủ đích; học viên bị từ chối API Admin.
- Học viên mở đúng bài được phép, xem video/PDF và tiếp tục tiến trình sau tải lại.
- Thử nộp bài/đồng hồ bằng tài khoản và bài kiểm thử được chủ dự án đồng ý, không làm sai tiến trình thật.
- Link Drive hoạt động với đúng tài khoản Google của học viên; upload hiện giới hạn 4 MB/tệp.
- Kiểm tra log không in mật khẩu, token, chuỗi kết nối hay đáp án chưa được phép xem.

## Vận hành

- Database hiện tại đã có nội dung thật: không dùng `prisma migrate reset`, `db push --force-reset`, hoặc script test ghi/xóa dữ liệu.
- Thay đổi schema sau này phải có backup và kiểm tra migration riêng trước `npm run db:deploy`.
- Rollback bản code không tự rollback dữ liệu. Giữ thay đổi schema tương thích nếu cần quay lại bản trước.
- Supabase Free có thể pause do ít hoạt động; deploy Vercel không loại bỏ giới hạn này.
- Theo dõi quota Vercel/Supabase/Drive/Cloudinary. Miễn phí không đồng nghĩa không giới hạn hoặc bảo đảm 24/7.
