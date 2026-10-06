"use client";
export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return <div role="alert" className="p-8 space-y-4"><h2>Không thể tải trang quản trị.</h2><p>Kiểm tra kết nối rồi thử lại. Dữ liệu đã lưu không bị xóa.</p><button className="underline" onClick={retry}>Thử lại</button></div>;
}
