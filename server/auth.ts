import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";

const AUTH_COOKIE_NAME = "encor_editor_auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSigningSecret() {
  return process.env.SESSION_SECRET || process.env.ENCORTRACKER_PASSWORD || "encortracker-dev-secret";
}

export function getEditorPassword() {
  return process.env.ENCORTRACKER_PASSWORD || "encor123";
}

function signValue(value: string) {
  return createHmac("sha256", getSigningSecret()).update(value).digest("hex");
}

function buildCookieValue() {
  const payload = "editor";
  return `${payload}.${signValue(payload)}`;
}

function parseCookies(req: Request) {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return {};

  return rawCookie.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function isEditorAuthenticated(req: Request) {
  const cookieValue = parseCookies(req)[AUTH_COOKIE_NAME];
  if (!cookieValue) return false;

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = signValue(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer) && payload === "editor";
}

export function setEditorAuthCookie(res: Response) {
  res.cookie(AUTH_COOKIE_NAME, buildCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS * 1000,
  });
}

export function clearEditorAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
