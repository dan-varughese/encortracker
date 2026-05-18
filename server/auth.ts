import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";

const AUTH_COOKIE_NAME = "encor_editor_auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSigningSecret() {
  const secret = process.env.SESSION_SECRET || process.env.ENCORTRACKER_PASSWORD;
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("CRITICAL: SESSION_SECRET env var is not set! Cookie signatures are insecure.");
    return null;
  }
  return secret || "encortracker-dev-secret";
}

export function getEditorPassword() {
  const password = process.env.ENCORTRACKER_PASSWORD;
  if (process.env.NODE_ENV === "production" && !password) {
    console.error("CRITICAL: ENCORTRACKER_PASSWORD env var is not set!");
    return null;
  }
  return password || "encor123";
}

function signValue(value: string) {
  const secret = getSigningSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("hex");
}

function buildCookieValue() {
  const payload = "editor";
  const signature = signValue(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
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
  if (!expectedSignature) return false;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer) && payload === "editor";
}

export function setEditorAuthCookie(res: Response) {
  const cookieValue = buildCookieValue();
  if (!cookieValue) return false;

  res.cookie(AUTH_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS * 1000,
  });
  return true;
}

export function clearEditorAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
