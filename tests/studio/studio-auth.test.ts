import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";
import { POST, GET, DELETE } from "../../app/api/auth/studio-session/route";
import { safeReturnPath, STUDIO_COOKIE } from "../../lib/studio-auth";
import {
  authDb,
  registerLocalUser,
  loginLocalUser,
  createLocalSession,
  currentLocalUser,
  revokeLocalSession,
} from "../../lib/local-auth-db";
before(() => {
  process.env.STUDIO_DB_PATH = join(
    mkdtempSync(join(tmpdir(), "chaya-accounts-")),
    "studio.sqlite",
  );
});
test("SQLite accounts store salted hashes and revocable, expiring sessions", async () => {
  const user = await registerLocalUser(
    "Owner@example.test",
    "a-long-local-password",
    "test",
  );
  const row = authDb().prepare("SELECT * FROM users WHERE id=?").get(user.id);
  assert.notEqual(row.password_hash, "a-long-local-password");
  assert.equal(row.email, "owner@example.test");
  assert.equal(
    (await loginLocalUser("owner@example.test", "a-long-local-password")).id,
    user.id,
  );
  await assert.rejects(
    () => loginLocalUser("owner@example.test", "incorrect"),
    /Incorrect/,
  );
  await assert.rejects(
    () =>
      registerLocalUser("OWNER@example.test", "a-long-local-password", "test"),
    /already exists/,
  );
  const token = await createLocalSession(user.id);
  assert.equal((await currentLocalUser(token))!.id, user.id);
  assert.equal(await currentLocalUser("forged"), null);
  assert.notEqual(
    authDb()
      .prepare("SELECT token_hash FROM sessions WHERE user_id=?")
      .get(user.id).token_hash,
    token,
  );
  await revokeLocalSession(token);
  assert.equal(await currentLocalUser(token), null);
  const expired = await createLocalSession(user.id);
  authDb().prepare("UPDATE sessions SET expires_at=0").run();
  assert.equal(await currentLocalUser(expired), null);
});
test("local signup/login route issues HttpOnly cookies, logout revokes them", async () => {
  const request = (body: object, origin = "https://studio.example") =>
    new NextRequest("https://studio.example/api/auth/studio-session", {
      method: "POST",
      headers: { origin },
      body: JSON.stringify(body),
    });
  const signup = await POST(
    request({
      action: "signup",
      email: "account@example.test",
      password: "another-long-password",
      role: "ADMIN",
    }),
  );
  assert.equal(signup.status, 200);
  const cookie = signup.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=lax/i);
  const header = cookie.split(";")[0];
  const signedIn = await GET(
    new NextRequest("https://studio.example/api/auth/studio-session", {
      headers: { cookie: header },
    }),
  );
  assert.equal(signedIn.status, 200);
  assert.equal((await signedIn.json()).user.role, undefined);
  const logout = await DELETE(
    new NextRequest("https://studio.example/api/auth/studio-session", {
      method: "DELETE",
      headers: { cookie: header },
    }),
  );
  assert.equal(logout.status, 200);
  assert.equal(
    (
      await GET(
        new NextRequest("https://studio.example/api/auth/studio-session", {
          headers: { cookie: header },
        }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await POST(
        request({
          action: "login",
          email: "account@example.test",
          password: "another-long-password",
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await POST(request({ action: "signup" }, "https://untrusted.example")))
      .status,
    403,
  );
});
test("Studio middleware redirects guests and rejects unsigned API access", async () => {
  for (const path of [
    "/studio",
    "/studio/live",
    "/studio/live/display?session=room",
  ]) {
    const r = await middleware(new NextRequest("http://localhost:3000" + path));
    assert.equal(r.status, 307);
    assert.equal(
      new URL(r.headers.get("location")!).searchParams.get("next"),
      path,
    );
  }
  assert.equal(
    (await middleware(new NextRequest("http://localhost:3000/api/studio/live")))
      .status,
    401,
  );
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  try {
    assert.equal(
      (
        await middleware(
          new NextRequest("http://localhost:3000/studio", {
            headers: { cookie: `${STUDIO_COOKIE}=forged` },
          }),
        )
      ).status,
      307,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("return paths stay within the app", () => {
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
  ])
    assert.equal(safeReturnPath(path), "/studio");
  assert.equal(safeReturnPath("/studio/live"), "/studio/live");
});
