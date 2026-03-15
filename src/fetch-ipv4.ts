/**
 * IPv4만 사용하는 fetch. IPv6 "No route to host" 환경에서 Telegram API 연결용.
 */
import https from "node:https";
import http from "node:http";
import dns from "node:dns";

const lookupIPv4 = (
  hostname: string,
  options: dns.LookupOneOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
) => {
  dns.lookup(hostname, { ...options, family: 4 }, callback);
};

const httpsAgent = new https.Agent({ lookup: lookupIPv4 as typeof dns.lookup });
const httpAgent = new http.Agent({ lookup: lookupIPv4 as typeof dns.lookup });

function getBody(init?: RequestInit | { body?: BodyInit | null }): Buffer | undefined {
  const body = init?.body;
  if (body == null) return undefined;
  if (typeof body === "string") return Buffer.from(body, "utf-8");
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body as Uint8Array);
  return undefined;
}

export function fetchIPv4(
  input: URL | Request | string,
  init?: RequestInit
): Promise<Response> {
  let url: URL;
  let method = init?.method ?? "GET";
  let headers = init?.headers;

  if (typeof input === "string") {
    url = new URL(input);
  } else if (input instanceof URL) {
    url = input;
  } else {
    url = new URL(input.url);
    method = input.method;
    const h: Record<string, string> = {};
    input.headers.forEach((v, k) => {
      h[k] = v;
    });
    headers = h;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return fetch(input, init);
  }

  const body = getBody(init);

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method,
      agent: url.protocol === "https:" ? httpsAgent : httpAgent,
      headers: headers as Record<string, string> | undefined,
    };

    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve(
          new Response(buf, {
            status: res.statusCode ?? 200,
            statusText: res.statusMessage,
            headers: new Headers(res.headers as HeadersInit),
          })
        );
      });
    });

    req.on("error", reject);

    if (body) req.write(body);
    req.end();
  });
}
