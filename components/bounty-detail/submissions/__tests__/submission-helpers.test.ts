import { getStatusBadgeColor, isSafeHttpUrl } from "../submission-helpers";

describe("getStatusBadgeColor", () => {
  it("returns emerald classes for APPROVED", () => {
    expect(getStatusBadgeColor("APPROVED")).toBe(
      "bg-emerald-100 text-emerald-900",
    );
  });

  it("returns red classes for REJECTED", () => {
    expect(getStatusBadgeColor("REJECTED")).toBe("bg-red-100 text-red-900");
  });

  it("returns gray classes for PENDING", () => {
    expect(getStatusBadgeColor("PENDING")).toBe("bg-gray-100 text-gray-900");
  });

  it("returns gray classes for unknown statuses", () => {
    expect(getStatusBadgeColor("UNDER_REVIEW")).toBe(
      "bg-gray-100 text-gray-900",
    );
  });
});

describe("isSafeHttpUrl", () => {
  it("returns true for http URLs", () => {
    expect(isSafeHttpUrl("http://example.com/pr/1")).toBe(true);
  });

  it("returns true for https URLs", () => {
    expect(isSafeHttpUrl("https://github.com/org/repo/pull/42")).toBe(true);
  });

  it("returns false for non-http protocols", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("ftp://example.com/file")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isSafeHttpUrl("not-a-url")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });
});
