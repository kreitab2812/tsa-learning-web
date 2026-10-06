import { test } from "node:test";
import assert from "node:assert/strict";
import { isWriteConflict } from "../../server/db/write-conflict";
import { getYoutubeEmbedUrl } from "../../lib/media";
import { assertSameOrigin } from "../../server/http/request";

test("only known serialization/deadlock errors are retried", () => {
  assert.equal(isWriteConflict(Object.assign(new Error(), { code: "P2034" })), true);
  assert.equal(isWriteConflict(Object.assign(new Error("commit", { cause: { kind: "TransactionWriteConflict" } }), { name: "DriverAdapterError" })), true);
  assert.equal(isWriteConflict(Object.assign(new Error(), { code: "P2003" })), false);
  assert.equal(isWriteConflict(new Error("TransactionWriteConflict")), false);
});
test("YouTube embed uses exact approved hostnames and validates video id", () => {
  assert.equal(getYoutubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  for (const url of ["https://youtube.com.evil.invalid/watch?v=dQw4w9WgXcQ", "https://notyoutube.com/embed/x", "javascript:alert(1)", "https://youtu.be/invalid"]) assert.equal(getYoutubeEmbedUrl(url), null);
});
test("dev same-origin honors actual Host despite internal URL normalization", () => {
  assert.doesNotThrow(() => assertSameOrigin(new Request("http://localhost:3000/api/auth/login", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } })));
});
