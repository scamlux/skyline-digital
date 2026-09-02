import { describe, it, expect } from "vitest";
import { normalizePhone, isValidUzPhone, normalizeWebsite, normalizeEmail, isSocialHost } from "./validate";

describe("normalizePhone", () => {
  it("normalises messy UZ formats to +998XXXXXXXXX", () => {
    expect(normalizePhone("+998 90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("(90) 123-45-67")).toBe("+998901234567");
    expect(normalizePhone("901234567")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
    expect(normalizePhone("0901234567")).toBe("+998901234567");
  });
  it("rejects non-UZ / junk", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("+1 202 555 0100")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
  it("isValidUzPhone mirrors normalize", () => {
    expect(isValidUzPhone("901234567")).toBe(true);
    expect(isValidUzPhone("nope")).toBe(false);
  });
});

describe("normalizeWebsite", () => {
  it("adds scheme, strips www + trailing slash", () => {
    expect(normalizeWebsite("example.uz")).toBe("https://example.uz");
    expect(normalizeWebsite("http://www.example.uz/")).toBe("https://example.uz");
    expect(normalizeWebsite("https://example.uz/clinic/")).toBe("https://example.uz/clinic");
  });
  it("rejects social links and non-hosts", () => {
    expect(normalizeWebsite("https://instagram.com/clinic")).toBeNull();
    expect(normalizeWebsite("https://t.me/clinic")).toBeNull();
    expect(normalizeWebsite("localhost")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
  it("isSocialHost detects socials", () => {
    expect(isSocialHost("www.instagram.com")).toBe(true);
    expect(isSocialHost("t.me")).toBe(true);
    expect(isSocialHost("example.uz")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("validates + lowercases", () => {
    expect(normalizeEmail("Info@Clinic.UZ")).toBe("info@clinic.uz");
    expect(normalizeEmail("not-an-email")).toBeNull();
  });
});
