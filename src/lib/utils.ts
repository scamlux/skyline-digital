import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomBytes } from "crypto";

/** Tailwind-aware className merge (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * URL-safe token for addressable estimate pages.
 * 32 bytes -> 43 base64url chars. ТЗ §11 requires 32+ characters: the token IS
 * the only credential guarding a proposal, so it must not be brute-forceable.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Format a USD amount without decimals, e.g. 1500 -> "$1,500". */
export function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}
