export default async function handler(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let targetOrigin: string;
  try {
    targetOrigin = new URL(targetUrl).origin;
  } catch {
    return new Response("Invalid url parameter", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": request.headers.get("user-agent") || "" },
      redirect: "follow",
    });

    // Copy headers, stripping frame-blocking ones
    const headers = new Headers();
    for (const [key, value] of response.headers.entries()) {
      const k = key.toLowerCase();
      if (k === "x-frame-options") continue;
      if (k === "content-security-policy") continue;
      if (k === "content-security-policy-report-only") continue;
      headers.set(key, value);
    }

    const contentType = response.headers.get("content-type") || "";
    // Use final URL origin (after redirects) for the base tag
    const finalOrigin = response.url ? new URL(response.url).origin : targetOrigin;

    // For HTML responses, fix <base> tag so relative URLs resolve correctly
    if (contentType.includes("text/html")) {
      let html = await response.text();
      const baseTag = `<base href="${finalOrigin}/">`;

      // Remove any existing <base> tags first
      html = html.replace(/<base[^>]*>/gi, "");

      if (/<head[\s>]/i.test(html)) {
        html = html.replace(/<head([\s>])/i, "<head$1" + baseTag);
      } else {
        html = baseTag + html;
      }

      return new Response(html, { status: response.status, headers });
    }

    return new Response(response.body, { status: response.status, headers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response("Proxy error: " + msg, { status: 502 });
  }
}

export const config = { path: "/proxy" };
