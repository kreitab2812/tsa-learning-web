import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { assertSameOrigin, readJson } from "../../server/http/request";
import { HttpError } from "../../server/http/errors";
import { hashPassword, verifyPassword } from "../../server/auth/password";

test("salted password hashes reject wrong and malformed credentials", async () => {
  const password = "Test-only password !1234";
  const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password + "wrong", first), false);
  assert.equal(await verifyPassword(password, password), false);
  assert.equal(await verifyPassword(password, "scrypt-v1$broken$hash"), false);
});
test("CSRF checks reject missing, null and foreign origins", () => {
  const base = process.env.APP_ORIGIN || "https://tsa.example";
  const request = (origin?: string) => new Request(`${base}/api/admin/courses`, { method: "POST", headers: origin ? { origin } : {} });
  assert.doesNotThrow(() => assertSameOrigin(request(base)));
  for (const origin of [undefined, "null", "https://evil.example"]) {
    assert.throws(() => assertSameOrigin(request(origin)), (error: unknown) => error instanceof HttpError && error.status === 403);
  }
});
test("bounded JSON reader rejects wrong media type, malformed JSON and streaming oversized bodies", async () => {
  const make = (body: string, type = "application/json") => new Request("https://tsa.example", { method: "POST", body, headers: { "Content-Type": type } });
  const schema = z.strictObject({ title: z.string() });
  assert.deepEqual(await readJson(make('{"title":"TSA"}'), schema), { title: "TSA" });
  for (const [request, status, limit] of [[make("{broken"), 400, 100], [make("{}", "text/plain"), 415, 100], [make('{"title":"123456789"}'), 413, 8]] as const) {
    await assert.rejects(readJson(request, schema, limit), (error: unknown) => error instanceof HttpError && error.status === status);
  }
});
