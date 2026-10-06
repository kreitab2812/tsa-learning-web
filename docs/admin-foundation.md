# Bàn giao nền tảng Admin — 17/09/2026

## Phạm vi đã triển khai

Chốt phạm vi ưu tiên 1–4; chưa xây luồng học viên, không mở đăng ký hay thu
phí. Dừng sau vòng kiểm tra cuối theo yêu cầu chủ dự án. Workspace có thay
đổi từ nhiều lượt trước; không coi toàn bộ git diff là một lượt sửa mới.

1. **Xác thực và hợp đồng dữ liệu:** password hash scrypt, session token
   ngẫu nhiên chỉ lưu hash trong DB, cookie HttpOnly/SameSite/Secure ở
   production, kiểm tra quyền ở từng API admin, kiểm tra Origin, giới hạn
   đăng nhập và kích thước JSON, schema Zod dùng chung. Đổi mật khẩu thu
   hồi mọi phiên; chống phiên mới được tạo từ mật khẩu cũ đang xác thực.
2. **Toàn vẹn dữ liệu:** migration auth và enum LessonStatus; ràng buộc
   lịch xuất bản/ngày mở/thứ tự không âm; chapter cha cùng môn; không cho
   PATCH tự ý di chuyển cha. Ghi nội dung SERIALIZABLE và retry conflict
   P2034/pg adapter; max(order)+1; reorder cập nhật theo lô; import tối đa
   100 câu hỏi nguyên tử. Ngày từ giao diện chuyển ISO UTC.
3. **Tách CMS:** app giữ route/layout, features chứa UI/types/hooks; cây
   chapter, form course/lesson, question card, media field và logic tải dữ
   liệu tách riêng. API mỏng; query/mutation nằm ở server/admin. Dashboard
   dùng số liệu thật; chỉ giữ menu có trang; có đổi mật khẩu và trạng thái
   lỗi/tải. Trang danh sách khóa học vẫn có thể tách form nhỏ hơn sau này,
   nhưng không mở rộng refactor trong lần chốt này.
4. **Giảm truy vấn/payload:** course outline không kèm toàn bộ bài học;
   tải cây riêng theo môn; sửa nội dung chỉ làm mới môn đang chọn; khóa
   học/câu hỏi phân trang 20 mục, lấy thêm một mục để xác định trang sau;
   metadata bài học không kèm câu hỏi. Tra session dùng một JOIN. Pool
   giới hạn 3 connection/process, connect timeout 10 giây. Đây là giới hạn
   thận trọng cho một tài khoản, không phải cấu hình đã tối ưu cho tải lớn.

## Đo đạc

Đo lúc 08:20 UTC, từ máy phát triển tới PostgreSQL đang cấu hình. Fixture
gồm 3 giai đoạn, 9 môn, 90 chapter, 720 bài và 100 câu hỏi. Mỗi trường hợp
có một lần warm-up và 5 mẫu; p95 dưới đây là mẫu lớn nhất của 5 mẫu, không
đại diện p95 production. Fixture benchmark đã được dọn.

| Trường hợp | SQL/lượt | JSON bytes | p50 ms | p95 mẫu ms |
| --- | ---: | ---: | ---: | ---: |
| Baseline toàn cây khóa học | 5 | 205354 | 2378 | 2756 |
| Outline khóa học | 3 | 2008 | 976 | 982 |
| Một môn (80 bài) | 3 | 22795 | 1030 | 1041 |
| Baseline bài học + mọi câu hỏi | 3 | 107965 | 1298 | 1631 |
| Metadata bài học | 2 | 461 | 657 | 667 |
| Trang 20 câu hỏi | 1 | 21519 | 344 | 422 |
| HTTP outline, có session, dev | — | 2034 | 1402 | 1695 |
| HTTP một môn, có session, dev | — | 22822 | 1349 | 1373 |
| HTTP câu hỏi, có session, dev | — | 21534 | 702 | 740 |

Outline giảm khoảng 99% payload, nhưng khi mở môn vẫn cần tải nhánh đó.
Không diễn giải số đo outline như đã tải xong toàn khóa học. EXPLAIN truy
vấn bài học theo chapter dùng `Lesson_chapterId_order_idx`; execution
1,667 ms trong mẫu, khác với round-trip mạng khoảng 326 ms trước đó.
Chưa có bằng chứng cần thêm index hoặc Redis. Một môn cực lớn vẫn cần
phân trang nhánh sâu hơn; OFFSET ở trang rất xa vẫn cần đánh giá lại.

Tái lập (chỉ database test, cần server local đang chạy):

```bash
ALLOW_INTEGRATION_TESTS=1 DB_QUERY_METRICS=1 TEST_BASE_URL=http://127.0.0.1:3000 node --env-file=.env --conditions=react-server --import tsx scripts/benchmark-admin.ts
```

## Kiểm chứng và giới hạn

Vòng chốt cuối sau yêu cầu giới hạn phạm vi: **10 unit test và 9 kiểm thử
HTTP/database đều qua**; `npm run check` không lỗi/cảnh báo lint;
`prisma migrate status` xác nhận đủ 2 migration; production build Webpack
thành công. Không chạy thêm vòng sửa/refactor sau kết quả này. Đã xóa
fixture UI (1 tài khoản, 1 khóa học); giữ nguyên tài khoản và nội dung của
chủ dự án. Các test tích hợp tự dọn đúng fixture của chúng.

- Test DB đã qua: lịch, cây sâu hơn ba tầng, cha khác môn, tạo đồng thời,
  reorder, import nguyên tử, cascade, token/role/rotation/logout/expiry,
  rate limit. Test HTTP đã qua: mọi endpoint admin chặn 401/403, CSRF,
  CRUD, phân trang, tải các trang admin, đổi mật khẩu và đăng xuất.
- Production build Webpack đã qua. Đã phát hiện và sửa khác biệt Origin
  localhost/127.0.0.1 và thời gian chờ transaction auth quá ngắn khi mở
  kết nối SQL xa. Không đổi mặc định Turbopack; dev cũ có lỗi HMR và đã
  khởi động lại bằng Webpack.
- Trình duyệt đã đăng nhập và hiển thị dashboard/danh sách/form. Lần kiểm
  tra lưu bằng UI gặp lỗi DNS `EAI_AGAIN` tới Supabase; không tuyên bố
  hoàn tất E2E trình duyệt. Không sửa DNS/hạ tầng ngoài phạm vi.
- `npm audit --omit=dev` còn **4 high** trong chuỗi Prisma/config,
  deepmerge-ts và mysql2. Npm đề xuất thay Prisma major; chưa áp dụng
  `audit fix --force`. Cần đánh giá/bản vá tương thích trước public deploy.
- 10 bảng: RLS chưa bật; kiểm tra `has_table_privilege` cho thấy anon và
  authenticated không có SELECT hiệu lực. Kết nối hiện tại là owner và
  bypass RLS. Đây không phải audit đầy đủ mọi grant/function/Data API.
  Cần rà quyền triển khai trước khi đưa ra Internet; không dùng public
  Supabase client truy cập bảng nghiệp vụ. Hai SDK Supabase không dùng đã
  được gỡ; DB vẫn ở Supabase.
- Rate limit theo tài khoản chưa thay thế chống DDoS ở biên mạng. Cần dọn
  session/throttle hết hạn bằng `npm run auth:cleanup`; chưa thêm cron.
- Tài khoản thực đầu tiên: `cuongdmanh06@gmail.com`. Mật khẩu chỉ nằm ở
  tệp `.local/credentials-…txt` (0600, thư mục 0700, gitignored), không
  được ghi trong tài liệu/repository. Sau khi cất vào trình quản lý mật
  khẩu và đổi mật khẩu trong Admin, tự xóa tệp riêng đó.

## Định hướng miễn phí

Giữ một ứng dụng Next.js + PostgreSQL, một tài khoản quản trị; không thêm
dịch vụ trả phí, Redis, worker hoặc email OTP. Ảnh hỗ trợ dán URL; upload
Cloudinary là tùy chọn khi có cấu hình. Hạn mức upload phía UI không phải
biện pháp bảo mật: unsigned preset cần giới hạn phía nhà cung cấp, hoặc
chuyển signed upload trước khi dùng công khai. Video chỉ lưu URL, không
thêm pipeline upload/transcode.

Không cam kết miễn phí vô hạn: kiểm tra quota thực tế của Supabase,
Cloudinary và nơi hosting trước deploy; không bật overage/trả phí tự động
mà chưa được chủ dự án chấp thuận. Chưa triển khai website công khai.
Luồng học viên, điều kiện mở khóa tuần tự, nộp/chấm/lưu lịch sử vẫn thuộc
giai đoạn sau; tuyệt đối không tái dùng DTO admin có đáp án cho học viên.
