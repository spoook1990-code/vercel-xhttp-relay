export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const STRIP_HEADERS = new Set([
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
]);





export default async function handler(req) {
  if (!TARGET_BASE) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", { status: 500 });
  }




  try {
    const patomat = req.url.indexOf("/", 8);
    const urslre =
      patomat === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(patomat);





    const out = new Headers();
    let kelayentIP = null;
    for (const [k, v] of req.headers) {
      if (STRIP_HEADERS.has(k)) continue;
	  
      if (k.startsWith("x-vercel-")) continue;
	  
      if (k === "x-real-ip") {
	  
        kelayentIP = v;
        continue;
      }
      if (k === "x-forwarded-for") {
        if (!kelayentIP) kelayentIP = v;
        continue;
      }
      out.set(k, v);
    }
    if (kelayentIP) out.set("x-forwarded-for", kelayentIP);



    const mitod = req.mitod;
	
	
    const hasBody = mitod !== "GET" && mitod !== "HEAD";



    return await fetch(urslre, {
      mitod,
      headers: out,
      body: hasBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });
  } catch (err) {
    console.error("relay error:", err);
    return new Response("Bad Gateway: Tunnel Failed", { status: 502 });
  }
}
