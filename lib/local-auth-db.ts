import { cloudflareDatabase, type SqlDatabase } from "./studio-database";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const hashPassword = promisify(scrypt);
const builtinModule = (
  process as typeof process & { getBuiltinModule: (id: string) => any }
).getBuiltinModule;
type DB = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...args: any[]) => any;
    run: (...args: any[]) => any;
  };
};
const cache = globalThis as typeof globalThis & {
  chayaAuthDatabases?: Map<string, DB>;
};
export type LocalUser = { id: string; email: string; created_at: string };
export function authDb() {
  const path =
    process.env.STUDIO_DB_PATH || resolve(process.cwd(), "data/studio.sqlite");
  const databases = (cache.chayaAuthDatabases ??= new Map());
  let db = databases.get(path);
  if (db) return db;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const { DatabaseSync } = builtinModule("node:sqlite");
  db = new DatabaseSync(path) as DB;
  chmodSync(path, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);`);
  databases.set(path, db);
  return db;
}
export async function accountDatabase(): Promise<SqlDatabase> {
  const cloud = await cloudflareDatabase();
  if (cloud) return cloud;
  const db = authDb();
  return {
    first: async (sql, ...values) => db.prepare(sql).get(...values),
    run: async (sql, ...values) => db.prepare(sql).run(...values),
  };
}
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentLocalUser(
  token?: string,
): Promise<LocalUser | null> {
  if (!token || token.length > 200) return null;
  return (
    (await (
      await accountDatabase()
    ).first(
      "SELECT u.id,u.email,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
      tokenHash(token),
      Date.now(),
    )) ?? null
  );
}
export async function revokeLocalSession(token?: string) {
  if (token)
    await (
      await accountDatabase()
    ).run("DELETE FROM sessions WHERE token_hash=?", tokenHash(token));
}
export async function createLocalSession(userId: string) {
  const token = randomBytes(32).toString("base64url"),
    db = await accountDatabase();
  await db.run("DELETE FROM sessions WHERE expires_at<=?", Date.now());
  await db.run(
    "INSERT INTO sessions VALUES(?,?,?)",
    tokenHash(token),
    userId,
    Date.now() + 7 * 86400000,
  );
  return token;
}
export async function accountRateLimit(
  key: string,
  limit = 10,
  windowMs = 15 * 60000,
) {
  const db = await accountDatabase(),
    now = Date.now(),
    hashed = tokenHash(key);
  // Atomic increment avoids concurrent requests bypassing the limit across Workers.
  const row = await db.first(
    `INSERT INTO auth_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count`,
    hashed,
    now + windowMs,
    now,
    now,
  );
  if (row.count > limit)
    throw new Error("Too many attempts. Please try again later.");
  return hashed;
}

function credentials(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string")
    throw new Error("Email and password are required.");
  const normalized = email.trim().toLowerCase();
  if (
    normalized.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(normalized) ||
    password.length > 128
  )
    throw new Error("Enter a valid email and password.");
  return { email: normalized, password };
}
export async function registerLocalUser(
  email: unknown,
  password: unknown,
  ip: string,
) {
  const c = credentials(email, password);
  await accountRateLimit(`signup:${ip}`);
  if (c.password.length < 10)
    throw new Error("Use a password with at least 10 characters.");
  const salt = randomBytes(16).toString("hex"),
    hash = (await hashPassword(c.password, salt, 64)) as Buffer;
  const user = {
    id: randomUUID(),
    email: c.email,
    created_at: new Date().toISOString(),
  };
  try {
    await (
      await accountDatabase()
    ).run(
      "INSERT INTO users VALUES(?,?,?,?,?)",
      user.id,
      user.email,
      hash.toString("hex"),
      salt,
      user.created_at,
    );
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      throw new Error(
        "An account with this email already exists. Sign in instead.",
      );
    throw error;
  }
  return user;
}
export async function loginLocalUser(email: unknown, password: unknown) {
  const c = credentials(email, password),
    key = await accountRateLimit(`login:${c.email}`);
  const row = await (
    await accountDatabase()
  ).first("SELECT * FROM users WHERE email=?", c.email);
  const computed = (await hashPassword(
    c.password,
    row?.salt ?? "unregistered-account",
    64,
  )) as Buffer;
  const stored = row ? Buffer.from(row.password_hash, "hex") : Buffer.alloc(64);
  if (!row || !timingSafeEqual(computed, stored))
    throw new Error("Incorrect email or password.");
  await (
    await accountDatabase()
  ).run("DELETE FROM auth_attempts WHERE key=?", key);
  return {
    id: row.id,
    email: row.email,
    created_at: row.created_at,
  } as LocalUser;
}
