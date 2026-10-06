import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ScanResult = { status: "HEALTHY" | "BROKEN" | "BLOCKED"; statusCode: number | null; error: string | null };

export function isPrivateAddress(address: string) {
  const value = address.toLowerCase().split("%")[0];
  if (value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mapped ?? (isIP(value) === 4 ? value : null);
  if (!ipv4) return false;
  const [a, b] = ipv4.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19));
}

async function assertPublicTarget(url: URL) {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("BLOCKED: URL không an toàn.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || isPrivateAddress(hostname)) throw new Error("BLOCKED: Địa chỉ nội bộ không được phép quét.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Hết thời gian phân giải tên miền.")), 3000); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) throw new Error("BLOCKED: Tên miền trỏ đến địa chỉ nội bộ.");
}

export async function checkPublicLink(value: string): Promise<ScanResult> {
  try {
    let current = new URL(value);
    const signal = AbortSignal.timeout(5000);
    for (let redirect = 0; redirect <= 3; redirect++) {
      await assertPublicTarget(current);
      let response = await fetch(current, { method: "HEAD", redirect: "manual", signal, headers: { "User-Agent": "TSA-Link-Health/1.0" } });
      if ([405, 501].includes(response.status)) {
        response = await fetch(current, { method: "GET", redirect: "manual", signal, headers: { "Range": "bytes=0-0", "User-Agent": "TSA-Link-Health/1.0" } });
        await response.body?.cancel();
      }
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        current = new URL(response.headers.get("location")!, current);
        continue;
      }
      if ([401, 403, 429].includes(response.status)) return { status: "BLOCKED", statusCode: response.status, error: `HTTP ${response.status} — cần kiểm tra quyền truy cập hoặc giới hạn của nguồn.` };
      return response.ok ? { status: "HEALTHY", statusCode: response.status, error: null }
        : { status: "BROKEN", statusCode: response.status, error: `HTTP ${response.status}` };
    }
    return { status: "BROKEN", statusCode: null, error: "Quá nhiều lần chuyển hướng." };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Không thể kiểm tra link.";
    return { status: message.startsWith("BLOCKED:") ? "BLOCKED" : "BROKEN", statusCode: null, error: message.replace(/^BLOCKED:\s*/, "").slice(0, 250) };
  }
}
