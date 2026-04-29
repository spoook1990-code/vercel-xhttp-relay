export const config = { runtime: "edge" };

const BASE_URL = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const BLOCKED_HEADERS = [
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
];

const shouldSkipHeader = (key) =>
  BLOCKED_HEADERS.includes(key) || key.startsWith("x-vercel-");

const buildTargetUrl = (url) => {
  const index = url.indexOf("/", 8);
  return index === -1 ? `${BASE_URL}/` : BASE_URL + url.slice(index);
};

const extractHeaders = (reqHeaders) => {
  const headers = new Headers();
  let ip = null;

  reqHeaders.forEach((value, key) => {
    if (shouldSkipHeader(key)) return;

    if (key === "x-real-ip" || key === "x-forwarded-for") {
      ip ||= value;
      return;
    }

    headers.set(key, value);
  });

  if (ip) headers.set("x-forwarded-for", ip);

  return headers;
};

export default async function handler(request) {
  if (!BASE_URL) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", {
      status: 500,
    });
  }

  try {
    const target = buildTargetUrl(request.url);
    const headers = extractHeaders(request.headers);

    const options = {
      method: request.method,
      headers,
      redirect: "manual",
      duplex: "half",
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      options.body = request.body;
    }

    return await fetch(target, options);
  } catch (error) {
    console.error("relay error:", error);
    return new Response("Bad Gateway: Tunnel Failed", { status: 502 });
  }
}
