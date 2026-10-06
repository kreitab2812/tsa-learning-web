import { test } from "node:test";
import assert from "node:assert/strict";
import { getDrivePreviewUrl, getDocumentDownloadUrl, getYoutubeEmbedUrl } from "../../lib/media";
import { attachmentInput, MAX_UPLOAD_BYTES } from "../../features/lessons/attachments";
import { readUpload, validateUpload } from "../../server/media/upload-validation";
import { sealDriveSecret, openDriveSecret } from "../../server/media/drive-crypto";
import { uploadDriveFile, googleToken } from "../../server/media/google-drive";

test("embed URL allowlists preserve Drive resource keys and reject spoofed hosts", () => {
  assert.equal(getDrivePreviewUrl("https://drive.google.com/file/d/example-id/view?resourcekey=abc"), "https://drive.google.com/file/d/example-id/preview?resourcekey=abc");
  assert.equal(getDrivePreviewUrl("https://drive.google.com/open?id=example-id"), "https://drive.google.com/file/d/example-id/preview");
  for (const url of ["https://drive.google.com.evil.test/file/d/id/view", "https://drive.google.com/drive/folders/abc", "javascript:alert(1)", "https://user:password@drive.google.com/file/d/abc/view"]) assert.equal(getDrivePreviewUrl(url), null);
  assert.match(getDocumentDownloadUrl("https://drive.google.com/file/d/example-id/view?resourcekey=abc")!, /export=download.*resourcekey=abc/);
  assert.equal(getYoutubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
});

test("file policies reject unsupported formats, oversized and mismatched content", async () => {
  assert.equal(validateUpload("test.pdf", Buffer.from("%PDF-1.7\n%%EOF")).kind, "PDF");
  assert.equal(validateUpload("test.zip", Buffer.from([0x50, 0x4b, 0x05, 0x06])).kind, "ZIP");
  assert.throws(() => validateUpload("test.exe", Buffer.from("MZ")));
  assert.throws(() => validateUpload("test.pdf", Buffer.from("<script>")));
  assert.throws(() => validateUpload("test.pdf", Buffer.alloc(MAX_UPLOAD_BYTES + 1)));
  const oversized = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_UPLOAD_BYTES + 1)); controller.close(); } });
  await assert.rejects(readUpload(new Request("https://example.test", { method: "POST", body: oversized, duplex: "half" } as RequestInit)));
  assert.equal(attachmentInput.safeParse({ title: "Word", kind: "WORD", section: "THEORY", url: "https://drive.google.com/file/d/example-id/view" }).success, false);
  assert.equal(attachmentInput.safeParse({ title: "ZIP", kind: "ZIP", watermark: true, url: "https://drive.google.com/file/d/example-id/view" }).success, false);
});

test("Drive tokens are authenticated encrypted and upload sends only private file metadata", async () => {
  const previous = { key: process.env.GOOGLE_DRIVE_TOKEN_KEY, id: process.env.GOOGLE_DRIVE_CLIENT_ID, secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET, redirect: process.env.GOOGLE_DRIVE_REDIRECT_URI, origin: process.env.APP_ORIGIN };
  const originalFetch = global.fetch;
  try {
    process.env.GOOGLE_DRIVE_TOKEN_KEY = "11".repeat(32);
    const encrypted = sealDriveSecret("test-refresh-token");
    assert.ok(!encrypted.includes("test-refresh-token"));
    assert.equal(openDriveSecret(encrypted), "test-refresh-token");
    const tampered = Buffer.from(encrypted, "base64url"); tampered[20] ^= 1;
    assert.throws(() => openDriveSecret(tampered.toString("base64url")));
    process.env.GOOGLE_DRIVE_CLIENT_ID = "test-client"; process.env.GOOGLE_DRIVE_CLIENT_SECRET = "test-secret";
    process.env.GOOGLE_DRIVE_REDIRECT_URI = "http://localhost:3000/api/admin/drive/callback";
    delete process.env.APP_ORIGIN;
    global.fetch = async (input, init) => {
      assert.equal(String(input), "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id");
      const body = Buffer.from(init?.body as Uint8Array).toString();
      assert.match(body, /"name":"test.pdf"/); assert.match(body, /%PDF/);
      assert.ok(!body.includes('"permissions"')); assert.ok(!body.includes('"anyone"'));
      return Response.json({ id: "example-id" });
    };
    assert.equal(await uploadDriveFile("test-token", "test.pdf", "application/pdf", Buffer.from("%PDF-1.7")), "example-id");
    global.fetch = async () => Response.json({ error: "invalid_grant" }, { status: 400 });
    await assert.rejects(googleToken({ grant_type: "refresh_token", refresh_token: "private-test-token" }), /Google từ chối/);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries({ GOOGLE_DRIVE_TOKEN_KEY: previous.key, GOOGLE_DRIVE_CLIENT_ID: previous.id, GOOGLE_DRIVE_CLIENT_SECRET: previous.secret, GOOGLE_DRIVE_REDIRECT_URI: previous.redirect, APP_ORIGIN: previous.origin })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
