import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { checkPublicLink, isPrivateAddress } from "../../server/admin/link-check";
import { learningErrorSchema, linkScanSchema } from "../../features/learning/schemas";

test("link scan is bounded and blocks internal network targets", async () => {
  assert.equal(linkScanSchema.safeParse({ limit: 20 }).success, true);
  assert.equal(linkScanSchema.safeParse({ limit: 21 }).success, false);
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.1.1", "::1", "fd00::1"]) assert.equal(isPrivateAddress(address), true);
  assert.equal(isPrivateAddress("8.8.8.8"), false);
  assert.equal((await checkPublicLink("http://127.0.0.1/internal")).status, "BLOCKED");
});

test("error logs distinguish supported failure categories", () => {
  const lessonId = randomUUID();
  for (const type of ["VIDEO_LOAD", "DOCUMENT_LOAD", "SUBMISSION"]) {
    assert.equal(learningErrorSchema.safeParse({ lessonId, type, message: "Không tải được" }).success, true);
  }
  assert.equal(learningErrorSchema.safeParse({ lessonId, type: "UNKNOWN", message: "Lỗi" }).success, false);
  assert.equal(learningErrorSchema.safeParse({ lessonId, type: "VIDEO_LOAD", message: "" }).success, false);
});
