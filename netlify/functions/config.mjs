import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("kiosk-config");

  if (req.method === "GET") {
    const config = await store.get("current");
    return new Response(config || "{}", {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    });
  }

  if (req.method === "POST") {
    const body = await req.text();
    await store.set("current", body);
    return new Response('{"ok":true}', {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
