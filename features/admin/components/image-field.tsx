"use client";
import { CldUploadWidget } from "next-cloudinary";
import ContentImage from "./content-image";

export default function ImageField({ value, onChange, preset }: { value: string | null; onChange: (value: string | null) => void; preset?: string }) {
  return <div className="space-y-3">
    <input aria-label="URL ảnh" type="url" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} placeholder="https://… (URL ảnh có sẵn)" className="w-full border rounded-xl px-3 py-2" />
    {value && <div><ContentImage src={value} className="max-h-40 rounded-xl" /><button type="button" onClick={() => onChange(null)} className="text-sm text-red-600 underline">Bỏ ảnh</button></div>}
    {preset && process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? <CldUploadWidget uploadPreset={preset}
      options={{ multiple: false, resourceType: "image", maxFileSize: 2 * 1024 * 1024, clientAllowedFormats: ["png", "jpg", "jpeg", "webp"] }}
      onSuccess={(result) => { const info = result.info; if (typeof info === "object" && info && "secure_url" in info && typeof info.secure_url === "string") onChange(info.secure_url); }}>
      {({ open }) => <button type="button" onClick={() => open()} className="border rounded-xl px-4 py-2">Tải ảnh lên (tối đa 2 MB)</button>}
    </CldUploadWidget> : <p className="text-xs text-gray-500">Chưa cấu hình upload. Bạn vẫn có thể dán URL ảnh có sẵn.</p>}
  </div>;
}
