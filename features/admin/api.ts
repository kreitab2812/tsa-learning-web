export async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (response.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Discard authenticated router cache on session expiry.
    window.location.assign("/?expired=1");
    throw new Error("Phiên đăng nhập hết hạn.");
  }
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || "Không thể tải dữ liệu.");
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Lỗi kết nối đến máy chủ.";
}
