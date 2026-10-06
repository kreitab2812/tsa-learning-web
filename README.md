# TSA Learning Web

Next.js App Router + React + TypeScript + Tailwind + Prisma/PostgreSQL.
LMS cá nhân với Admin và học viên, không đăng ký công khai/thu phí.
Triển khai Vercel: xem [hướng dẫn phát hành](docs/deployment.md).

## Khởi chạy

1. Dùng Node.js 22. Tạo .env theo .env.example và điền DATABASE_URL.
2. Chạy npm ci (postinstall sinh Prisma Client).
3. Chạy npm run db:deploy trên database dành cho dự án.
4. Nếu chưa có tài khoản, chạy lệnh tạo quản trị bên dưới.
5. Chạy npm run dev; mở http://localhost:3000. Nếu dev gặp lỗi Turbopack,
   dừng đúng server của dự án rồi chạy npm run dev -- --webpack.

```bash
npm run user:create -- --email EMAIL_CUA_BAN --role ADMIN --name "Quản trị viên"
```

CLI từ chối ghi đè email đã tồn tại. Mật khẩu ngẫu nhiên lưu riêng tại
.local/credentials-…txt, quyền 0600, không commit. Không gửi mật khẩu trong
chat. Cất mật khẩu an toàn, đổi ở Admin → Tài khoản quản trị rồi tự xóa tệp
thông tin đăng nhập. Tài khoản đầu tiên của chủ dự án đã được tạo; không
cần chạy lại lệnh tạo hay reset database.

Cloudinary tùy chọn: không cấu hình vẫn có thể dán URL ảnh. Giới hạn ảnh
phía UI không thay thế giới hạn upload preset phía Cloudinary. Không thêm
hạ tầng video hay dịch vụ trả phí.

## Kiểm tra

```bash
npm run test
npm run check
npm run build -- --webpack
npm run db:status
npm run db:audit

# Chỉ database test: các fixture có ID riêng và được dọn trong finally.
ALLOW_INTEGRATION_TESTS=1 npm run test:integration
# Cần server local đang chạy để thêm test HTTP:
ALLOW_INTEGRATION_TESTS=1 RUN_HTTP_TESTS=1 TEST_BASE_URL=http://127.0.0.1:3000 npm run test:integration
```

check gồm Prisma validate, route typegen, TypeScript và ESLint. db:audit
chỉ đọc metadata/count và độ trễ; không in dữ liệu bản ghi/mật khẩu.
Benchmark có số đo và lệnh tái lập trong docs/admin-foundation.md.
Build tải font Google; đường Webpack đã được kiểm chứng trong môi trường
này. Không thay bundler mặc định chỉ để che lỗi môi trường.

## Tổ chức mã

```text
app/                 Route, layout, HTTP adapter
features/auth/       Login, shell, tài khoản
features/courses/    UI khóa học, cây, modal, hook và types
features/lessons/    UI bài học/câu hỏi, modal, card, hook và types
features/content/    Schema validation dùng chung
features/admin/      HTTP client, resource hook, UI dùng chung
server/auth/         Password, session, quyền, throttle
server/admin/        Query/mutation CMS
server/db/           Prisma singleton và transaction
server/http/         Lỗi, validation request, CSRF, phân trang
prisma/migrations/   Lịch sử schema; không sửa migration đã áp dụng
tests/               Unit, integration, baseline benchmark
scripts/             Tạo tài khoản, dọn auth, audit, benchmark
docs/                Bàn giao, số đo và rủi ro còn lại
```

Không import module server vào Client Component. API admin không cache
công khai; câu hỏi/đáp án admin không được dùng làm DTO học viên.

## Vận hành

- Production phải cấu hình APP_ORIGIN bằng origin HTTPS chính xác, không
  dấu / cuối. Cookie Secure bật ở production; dùng HTTPS khi deploy.
- Giữ DATABASE_URL ở server. Pool tối đa 3 connection mỗi process; số
  instance nhân lên sẽ làm tăng tổng connection.
- Chạy npm run auth:cleanup để dọn session/throttle hết hạn khi cần.
- Dùng migration mới cho thay đổi schema; không dùng db push/reset trên
  nội dung thật. Backup trước migration phá hủy dữ liệu.
- Miễn phí là mục tiêu trong quota nhà cung cấp, không cam kết vô hạn.
  Chưa public deploy; còn cảnh báo dependency và rà soát quyền DB/upload.

Trạng thái và giới hạn: [bàn giao Admin](docs/admin-foundation.md).
[Audit ban đầu](docs/architecture-review.md) được giữ làm baseline lịch sử.
