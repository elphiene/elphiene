const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS });
        }

        if (url.pathname === "/entries" && request.method === "GET") {
            const { results } = await env.DB.prepare(
                "SELECT name, message, created_at FROM entries ORDER BY created_at DESC LIMIT 100"
            ).all();
            return Response.json(results, { headers: CORS });
        }

        if (url.pathname === "/sign" && request.method === "POST") {
            let body;
            try {
                body = await request.json();
            } catch {
                return new Response("Bad request", { status: 400, headers: CORS });
            }

            const name = (body.name || "").trim();
            const message = (body.message || "").trim();

            if (!name || !message) {
                return new Response("Name and message are required", { status: 400, headers: CORS });
            }
            if (name.length > 50 || message.length > 500) {
                return new Response("Too long", { status: 400, headers: CORS });
            }

            await env.DB.prepare(
                "INSERT INTO entries (name, message, created_at) VALUES (?, ?, ?)"
            ).bind(name, message, new Date().toISOString()).run();

            return new Response("OK", { headers: CORS });
        }

        return new Response("Not found", { status: 404 });
    },
};
