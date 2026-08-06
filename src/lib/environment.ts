const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function configuredAppUrl(): URL | null {
  const value = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL)?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !LOCAL_HOSTS.has(url.hostname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function metadataBaseUrl(): URL {
  return configuredAppUrl() ?? new URL("http://localhost:3000");
}
