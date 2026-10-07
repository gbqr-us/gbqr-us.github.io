const REDIRECT_STATUS = 301;
const REDIRECT_MAX_AGE_SECONDS = 86400;
const HSTS_MAX_AGE_SECONDS = 31536000;
const PRODUCTION_HOST = "gbqr.us";

function canonicalPath(pathname) {
  const path = pathname.toLowerCase();
  const lastSegment = path.slice(path.lastIndexOf("/") + 1);
  if (lastSegment !== "" && !lastSegment.includes(".")) {
    return path + "/";
  }
  return path;
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function canonicalLocation(requestUrl) {
  const url = new URL(requestUrl);
  const pathname = canonicalPath(url.pathname);
  const target = new URL(url);
  target.pathname = pathname;
  target.hash = "";
  if (!isLocalHost(url.hostname) && url.protocol === "http:") {
    target.protocol = "https:";
  }
  if (target.pathname === url.pathname && target.protocol === url.protocol) {
    return null;
  }
  return target.toString();
}

function redirect(location) {
  return new Response(null, {
    status: REDIRECT_STATUS,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=" + REDIRECT_MAX_AGE_SECONDS,
    },
  });
}

export default {
  async fetch(request, env) {
    const location = canonicalLocation(request.url);
    if (location) {
      return redirect(location);
    }

    const response = await env.ASSETS.fetch(request);
    const hostname = new URL(request.url).hostname;
    if (hostname !== PRODUCTION_HOST) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", "max-age=" + HSTS_MAX_AGE_SECONDS);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
