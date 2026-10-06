# Rà soát nền tảng — 17/09/2026

> Đây là bản rà soát **trước** đợt triển khai auth/CMS tiếp theo. Các vấn đề
> bên dưới là baseline, không phải tất cả đều còn tồn tại. Xem trạng thái
> bàn giao hiện tại tại [admin-foundation.md](admin-foundation.md).

## Phạm vi và xác minh

Reset database test theo xác nhận của chủ dự án, áp dụng migration
`20260917000000_init_content_platform`, sinh lại Prisma Client và rà soát
mã nguồn. Chưa hoàn thành toàn bộ việc tái cấu trúc ứng dụng.

- Reset thành công; 8 bảng nghiệp vụ có 0 bản ghi; chưa seed.
- Các index trong schema đã hiện diện ở PostgreSQL.
- `prisma migrate status`: database schema up to date.
- Đối chiếu database thực tế với schema bằng `prisma migrate diff`: không
  phát hiện sai lệch.
- `npm run check`: schema hợp lệ, TypeScript qua, lint không lỗi và còn 4
  cảnh báo `no-img-element` trong trang khóa học/bài học.
- `npm run build -- --webpack`: production build thành công, gồm biên dịch,
  TypeScript và sinh trang. Build mặc định Turbopack bị môi trường chặn mở
  cổng nội bộ (EPERM), kể cả lần chạy yêu cầu quyền ngoài sandbox; chưa
  xác minh được đường build mặc định trên máy này. Không thay bundler mặc định.
- Chưa kiểm thử end-to-end trên trình duyệt trong đợt rà soát này.
- Chưa có bộ kiểm thử tự động hay test tải với dữ liệu đại diện.
- Workspace gồm cả thay đổi có sẵn của chủ dự án; toàn bộ git diff không
  phải chỉ là thay đổi của lần refactor này.

## Số đo kết nối

Đo bằng `npm run db:audit` lúc 04:53 UTC ngày 17/09/2026, từ máy phát triển
đến endpoint Supabase đang cấu hình:

| Phép đo | Kết quả |
| --- | --- |
| Thiết lập kết nối lần đầu | 2.964 ms |
| 10 lượt SELECT 1 trên kết nối đã mở | 324–331 ms/lượt |
| Trung vị | 326,5 ms/lượt |

Đây là round-trip gồm mạng và xử lý máy chủ, không phải SQL thuần hay độ
trễ production. Chưa có baseline trước refactor nên chưa thể kết luận mức
cải thiện. Database rỗng không đủ đánh giá index trên dữ liệu thực tế.

Ưu tiên giảm truy vấn nối tiếp và tái sử dụng kết nối. Đo lại từ nơi triển
khai ứng dụng, đặt máy chủ gần database, rồi dùng dữ liệu đại diện và
`EXPLAIN (ANALYZE, BUFFERS)` với truy vấn đọc để quyết định index bổ sung.
Không đổi vùng hoặc tăng pool chỉ dựa trên phép đo từ máy phát triển.

## Những điểm đã cải thiện

- Prisma Client duy nhất ở `server/db/prisma.ts`, có ranh giới server-only;
  bỏ client cũ không dùng ở `prisma/db.ts`.
- Query course tách ở `server/admin/course-queries.ts`, chọn field giao diện
  cần. Chapter lấy dạng phẳng rồi dựng cây, khắc phục giới hạn ba tầng cũ.
  Vẫn lấy toàn cây, chưa lazy-load, chưa có benchmark chứng minh nhanh hơn.
- Index cho quan hệ/thứ tự, lịch xuất bản khóa học và Progress–Lesson.
- API tạo lesson dùng đúng trường video/tài liệu trong schema.
- Có migration, lệnh kiểm tra chung, môi trường mẫu và script audit chỉ đọc.

## Vấn đề còn lại theo ưu tiên

| Ưu tiên | Bằng chứng | Việc cần làm |
| --- | --- | --- |
| P0 | Login trong trình duyệt, session localStorage, route admin không kiểm tra quyền | Auth server, session và RBAC tại mỗi điểm truy cập dữ liệu; test đăng xuất/hết hạn. |
| P0 | Route nhận trực tiếp request.json; bulk guard chỉ kiểm tra content/type | Schema validation dùng chung cho options, đáp án, URL; giới hạn bulk/body; chuẩn hóa lỗi 400/404. |
| P1 | Create stage/subject/chapter/lesson/question lấy count làm order | 0,1,2 → xóa 1 → count=2 → tạo mới trùng order=2. Cấp thứ tự và reorder trong transaction có quy tắc khóa đồng nhất; max+1 riêng lẻ vẫn có race khi tạo đồng thời. |
| P1 | Chapter POST không kiểm tra parent cùng subject | Validate cha–con cùng môn; khi có chức năng di chuyển phải chặn cycle; cân nhắc ràng buộc DB. |
| P1 | Lesson có SCHEDULED nhưng không publishAt; UI chỉ DRAFT/PUBLISHED | Chốt có hẹn giờ lesson hay không; tách enum hoặc thêm thời điểm và luật xuất bản; đồng bộ types. |
| P1 | Course/Stage nhận datetime-local không offset | Client gửi ISO UTC; hiển thị theo timezone đã chọn; hẹn giờ phải có ngày hợp lệ. |
| P1 | SEQUENTIAL/Progress mới là schema | Chốt điều kiện hoàn thành, quyền học và lịch sử làm bài trước khi triển khai học viên. |
| P1 | Mỗi mutation gọi lại fetchCourse/fetchLesson; GET lấy cả cây/câu hỏi | Tải theo nhánh, phân trang câu hỏi, cập nhật cache đúng nhánh; DTO học viên không chứa đáp án trước khi nộp. |
| P1 | Bulk tạo từng question trong transaction | Prisma Client hiện có createManyAndReturn; chuyển theo lô sau khi có validation, giới hạn batch và sort theo order vì không giả định thứ tự trả về. |
| P1 | Không có integration test/seed | Seed tái lập; test CRUD, cascade, cây sâu, lịch mở, race/reorder và auth; kiểm tra migration trên database test trong CI. |
| P2 | Trang admin 500–800 dòng; state, fetch, form, types trộn/lặp | Tách feature, component/hook và DTO; giảm fetch trùng giữa effect và mutation. |
| P2 | Pool mặc định; index Chapter bắt đầu bằng subjectId | Đo số connection theo instance, giới hạn pool/timeout hợp lý; đánh giá index parentId cho FK/cascade và createdAt cho course bằng query plan. |
| P2 | RLS tắt ở 8 bảng; không thấy grant trực tiếp cho anon/authenticated | Trước triển khai, rà schema Data API expose và quyền hiệu lực/kế thừa; chốt Prisma-only hay Supabase client + RLS. Grant trực tiếp không chứng minh toàn bộ truy cập an toàn. |
| P2 | Metadata scaffold, link chưa có trang, 4 ảnh dùng img | Hoàn thiện metadata, empty/error/loading state, điều hướng, ảnh/font sau khi luồng dữ liệu ổn. |

## Kiến trúc đích vừa đủ

Giữ Next.js và PostgreSQL trong một ứng dụng. Chưa có bằng chứng cần
microservice, Redis hay lớp repository tổng quát.

```text
app/                         Route, layout, loading/error, HTTP adapter
features/
  courses/                   Component, hook, DTO khóa học
  lessons/                   Video, tài liệu, trình soạn bài
  questions/                 Form/validation câu hỏi
  auth/                      Giao diện đăng nhập
server/
  db/                        Prisma duy nhất
  auth/                      Session và quyền
  admin/                     Query/mutation CMS theo miền
  learning/                  Quyền học, nộp bài, chấm điểm (sau này)
components/                  UI dùng chung
lib/                         Tiện ích nhỏ không phụ thuộc server
prisma/                      Schema/migration
tests/                       Nghiệp vụ và integration
```

Có thể chuyển mã ứng dụng vào src trong một commit cơ học riêng sau khi có
test. Việc đó không tự làm SQL nhanh hơn; ưu tiên ranh giới client/server,
validation và hợp đồng dữ liệu. Chỉ tách service/repository khi có trách
nhiệm thực tế, tránh lớp chỉ chuyển tiếp lời gọi. Chưa cache dữ liệu admin
hay đáp án dùng chung giữa người dùng trước khi có auth/invalidation đúng.

## Lộ trình và điều kiện hoàn thành

1. **Auth và hợp đồng dữ liệu:** chốt một cơ chế auth (Supabase SDK đã cài
   nhưng chưa dùng), session server, RBAC, validation. Chưa đăng nhập nhận
   401, học viên gọi admin nhận 403, API học viên không lộ đáp án.
2. **Toàn vẹn dữ liệu:** sửa cấp thứ tự/reorder, quan hệ chapter, timezone,
   status lesson; chốt Enrollment nếu phân quyền theo khóa học, Attempt/Answer
   nếu lưu lịch sử chấm bài. Progress là trạng thái tổng hợp, không mặc định
   thay thế lịch sử. Mỗi thay đổi có migration mới và test lỗi/đồng thời.
3. **Tách CMS theo feature:** chuyển từng màn hình, giữ URL/UX; cây, form,
   xác nhận xóa và hook riêng. CRUD/reorder/import qua kiểm thử hồi quy.
4. **Tối ưu có số đo:** seed đại diện, ghi số query/payload/API p50-p95 và
   thời gian kết nối; giảm round-trip, lazy-load/pagination, batch insert;
   xem query plan rồi điều chỉnh index/pool/cache.
5. **Học viên:** khóa học thật, mở khóa, video, nộp bài, chấm server, tiến độ,
   báo cáo và kiểm thử trình duyệt.

Mỗi chặng qua npm run check, production build và kiểm thử luồng thay đổi.
Không kết luận production-ready chỉ dựa vào TypeScript/lint.
