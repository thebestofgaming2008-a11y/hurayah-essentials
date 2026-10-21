import { expect, it } from "vitest";
import { safeRedirect } from "../lib/safeRedirect";

it.each(["//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "/%2Fevil.example", "/%5cevil.example", "/a/..//evil.example", "/\nevil.example", "", null])("rejects external or ambiguous login destination %s", (value) => {
  expect(safeRedirect(value)).toBe("/account");
});
it.each(["/admin", "/checkout", "/shop?subject=fiqh#products"])("preserves a local destination %s", (value) => {
  expect(safeRedirect(value)).toBe(value);
});
