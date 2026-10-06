"use client";

export async function logout() {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
    localStorage.removeItem("userSession");
    // Full navigation also clears any authenticated client router cache.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Clear authenticated in-memory state on logout.
    window.location.assign("/");
  } catch {
    alert("Không thể đăng xuất. Kiểm tra kết nối và thử lại.");
  }
}
