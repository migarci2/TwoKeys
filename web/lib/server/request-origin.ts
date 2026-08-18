export function requestHasAllowedOrigin(
  request: Pick<Request, "headers" | "url">,
  configuredOrigin = process.env.APP_ORIGIN,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password
  ) {
    return false;
  }
  if (configuredOrigin) {
    try {
      return parsed.origin === new URL(configuredOrigin).origin;
    } catch {
      return false;
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  return parsed.host === host;
}
