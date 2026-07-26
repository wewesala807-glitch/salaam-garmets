const DATA_KEYS = ["products", "categories", "config"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Filename",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // ---- Shop data: products / categories / config, stored as JSON in R2 ----
    if (url.pathname.startsWith("/data/")) {
      const key = url.pathname.replace("/data/", "");
      if (!DATA_KEYS.includes(key)) {
        return new Response("Not found", { status: 404, headers: cors });
      }

      if (request.method === "GET") {
        const obj = await env.SHOP_BUCKET.get(`data/${key}.json`);
        if (!obj) {
          return new Response("null", { headers: { ...cors, "Content-Type": "application/json" } });
        }
        const text = await obj.text();
        return new Response(text, { headers: { ...cors, "Content-Type": "application/json" } });
      }

      if (request.method === "PUT") {
        const auth = request.headers.get("Authorization") || "";
        if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
          return new Response("Unauthorized", { status: 401, headers: cors });
        }
        const body = await request.text();
        await env.SHOP_BUCKET.put(`data/${key}.json`, body, {
          httpMetadata: { contentType: "application/json" },
        });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // ---- Serve an uploaded image publicly ----
    if (request.method === "GET" && url.pathname.startsWith("/images/")) {
      const key = decodeURIComponent(url.pathname.replace("/images/", ""));
      const obj = await env.SHOP_BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404, headers: cors });
      const headers = new Headers(cors);
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(obj.body, { headers });
    }

    // ---- Upload an image (admin only, needs the shared secret) ----
    if (request.method === "POST" && url.pathname === "/upload") {
      const auth = request.headers.get("Authorization") || "";
      if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }
      const filename = request.headers.get("X-Filename") || "photo.jpg";
      const contentType = request.headers.get("Content-Type") || "application/octet-stream";
      const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "jpg";
      const key = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      await env.SHOP_BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });

      const publicUrl = `${url.origin}/images/${key}`;
      return new Response(JSON.stringify({ url: publicUrl }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
