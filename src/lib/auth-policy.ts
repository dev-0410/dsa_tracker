export function shouldAllowGoogleSignIn(options: {
  configurationReady: boolean;
  provider: string | null | undefined;
  emailVerified: boolean | null | undefined;
}) {
  return (
    options.configurationReady &&
    options.provider === "google" &&
    options.emailVerified === true
  );
}

export function safeAuthRedirect(url: string, baseUrl: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return `${baseUrl}${url}`;
  try {
    return new URL(url).origin === new URL(baseUrl).origin ? url : baseUrl;
  } catch {
    return baseUrl;
  }
}
