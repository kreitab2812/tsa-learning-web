// Hàm dùng chung để tính trạng thái "có nên hiển thị cho Học viên hay không"
// tại đúng thời điểm gọi hàm — không cần cron job, không cần cập nhật DB định kỳ.
export function isEffectivelyPublished(item: {
  status: string;
  publishAt?: Date | string | null;
}): boolean {
  if (item.status === "PUBLISHED") return true;

  if (item.status === "SCHEDULED" && item.publishAt) {
    return new Date() >= new Date(item.publishAt);
  }

  return false; // DRAFT, hoặc SCHEDULED nhưng chưa tới giờ publishAt
}
