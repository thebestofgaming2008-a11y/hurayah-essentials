// @vitest-environment node
import { convexTest } from "convex-test";
import { generateKeyPair, exportPKCS8 } from "jose";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
let privateKey: string;
beforeAll(async () => { privateKey = await exportPKCS8((await generateKeyPair("RS256", { extractable: true })).privateKey); });
beforeEach(() => {
  vi.stubEnv("JWT_PRIVATE_KEY", privateKey);
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  vi.stubEnv("SITE_URL", "https://shop.example");
  vi.stubEnv("RESEND_API_KEY", "test-email-key");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("creates an isolated account, rejects a wrong password and signs in again", async () => {
  const t = convexTest(schema, modules);
  const credentials = { email: "customer@example.com", password: "test-password-123" };
  const signup = await t.action(api.auth.signIn, { provider: "password", params: { ...credentials, flow: "signUp" } });
  expect(signup.tokens?.token).toBeTruthy();
  await expect(t.action(api.auth.signIn, { provider: "password", params: { ...credentials, password: "wrong-password", flow: "signIn" } })).rejects.toThrow();
  const login = await t.action(api.auth.signIn, { provider: "password", params: { ...credentials, flow: "signIn" } });
  expect(login.tokens?.token).toBeTruthy();
  expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(1);
});

it("sends a reset code through the configured provider without touching production", async () => {
  const t = convexTest(schema, modules);
  await t.action(api.auth.signIn, { provider: "password", params: { email: "reset@example.com", password: "old-password-123", flow: "signUp" } });
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "test-email" }));
  vi.stubGlobal("fetch", fetchMock);
  await t.action(api.auth.signIn, { provider: "password", params: { email: "reset@example.com", flow: "reset" } });
  expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(payload.to).toBe("reset@example.com");
  const code = payload.text.match(/\b\d{6}\b/)?.[0];
  expect(code).toBeTruthy();
  await t.action(api.auth.signIn, { provider: "password", params: { email: "reset@example.com", code, newPassword: "new-password-456", flow: "reset-verification" } });
  const result = await t.action(api.auth.signIn, { provider: "password", params: { email: "reset@example.com", password: "new-password-456", flow: "signIn" } });
  expect(result.tokens?.token).toBeTruthy();
});
