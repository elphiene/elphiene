const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── D1 helpers ────────────────────────────────────────────────────────────────

async function getStatus(env) {
    const { results } = await env.DB.prepare(
        "SELECT key, value FROM status"
    ).all();
    const out = { music: null, watching: null, playing: null, text: null };
    for (const row of results) {
        try { out[row.key] = JSON.parse(row.value); } catch {}
    }
    return out;
}

async function setStatus(env, key, value) {
    if (value === null) {
        await env.DB.prepare(
            "DELETE FROM status WHERE key = ?"
        ).bind(key).run();
    } else {
        await env.DB.prepare(
            `INSERT INTO status (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).bind(key, JSON.stringify(value), new Date().toISOString()).run();
    }
}

// ── Auto-poll: Trakt ──────────────────────────────────────────────────────────

async function pollTrakt(env) {
    if (!env.TRAKT_CLIENT_ID || !env.TRAKT_USERNAME) return;
    const traktHeaders = {
        "trakt-api-key": env.TRAKT_CLIENT_ID,
        "trakt-api-version": "2",
        "Content-Type": "application/json",
    };
    try {
        const res = await fetch(
            `https://api.trakt.tv/users/${env.TRAKT_USERNAME}/watching`,
            { headers: traktHeaders }
        );
        if (res.status === 204) {
            // Not currently watching — fall back to last history entry
            const histRes = await fetch(
                `https://api.trakt.tv/users/${env.TRAKT_USERNAME}/history?limit=1`,
                { headers: traktHeaders }
            );
            if (histRes.ok) {
                const hist = await histRes.json();
                const last = hist?.[0];
                if (last?.type === "movie") {
                    await setStatus(env, "watching", { title: last.movie.title, type: "movie" });
                } else if (last?.type === "episode") {
                    const ep = `S${String(last.episode.season).padStart(2, "0")}E${String(last.episode.number).padStart(2, "0")}`;
                    await setStatus(env, "watching", { title: `${last.show.title} ${ep}`, type: "show" });
                }
            }
            return;
        }
        const data = await res.json();
        if (data.type === "movie") {
            await setStatus(env, "watching", {
                title: data.movie.title,
                type: "movie",
            });
        } else if (data.type === "episode") {
            const ep = `S${String(data.episode.season).padStart(2, "0")}E${String(data.episode.number).padStart(2, "0")}`;
            await setStatus(env, "watching", {
                title: `${data.show.title} ${ep}`,
                type: "show",
            });
        }
    } catch (e) {
        console.error("Trakt poll error:", e);
    }
}

// ── Auto-poll: Steam ──────────────────────────────────────────────────────────

async function pollSteam(env) {
    if (!env.STEAM_API_KEY || !env.STEAM_ID) return;
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${env.STEAM_API_KEY}&steamids=${env.STEAM_ID}`
        );
        const data = await res.json();
        const player = data?.response?.players?.[0];
        if (player?.gameextrainfo) {
            await setStatus(env, "playing", { title: player.gameextrainfo });
        } else {
            // Not currently playing — fall back to most recently played game
            const recentRes = await fetch(
                `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${env.STEAM_API_KEY}&steamid=${env.STEAM_ID}&count=1`
            );
            const recentData = await recentRes.json();
            const lastGame = recentData?.response?.games?.[0];
            if (lastGame) {
                await setStatus(env, "playing", { title: lastGame.name });
            }
        }
    } catch (e) {
        console.error("Steam poll error:", e);
    }
}

// ── Fetch handler ─────────────────────────────────────────────────────────────

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS });
        }

        // Comments: list for a post
        if (url.pathname === "/comments" && request.method === "GET") {
            const post = url.searchParams.get("post") || "";
            if (!post)
                return new Response("post required", { status: 400, headers: CORS });
            const { results } = await env.DB.prepare(
                "SELECT name, message, created_at FROM comments WHERE post = ? ORDER BY created_at ASC LIMIT 200"
            ).bind(post).all();
            return Response.json(results, { headers: CORS });
        }

        // Comments: submit
        if (url.pathname === "/comment" && request.method === "POST") {
            let body;
            try { body = await request.json(); }
            catch { return new Response("Bad request", { status: 400, headers: CORS }); }

            const post = (body.post || "").trim();
            const name = (body.name || "").trim();
            const message = (body.message || "").trim();

            if (!post || !name || !message)
                return new Response("post, name and message required", { status: 400, headers: CORS });
            if (name.length > 50 || message.length > 500 || post.length > 100)
                return new Response("Too long", { status: 400, headers: CORS });

            await env.DB.prepare(
                "INSERT INTO comments (post, name, message, created_at) VALUES (?, ?, ?, ?)"
            ).bind(post, name, message, new Date().toISOString()).run();

            return new Response("OK", { headers: CORS });
        }

        // Guestbook: list entries
        if (url.pathname === "/entries" && request.method === "GET") {
            const { results } = await env.DB.prepare(
                "SELECT name, message, created_at FROM entries ORDER BY created_at DESC LIMIT 100"
            ).all();
            return Response.json(results, { headers: CORS });
        }

        // Guestbook: sign
        if (url.pathname === "/sign" && request.method === "POST") {
            let body;
            try { body = await request.json(); }
            catch { return new Response("Bad request", { status: 400, headers: CORS }); }

            const name = (body.name || "").trim();
            const message = (body.message || "").trim();

            if (!name || !message)
                return new Response("Name and message required", { status: 400, headers: CORS });
            if (name.length > 50 || message.length > 500)
                return new Response("Too long", { status: 400, headers: CORS });

            await env.DB.prepare(
                "INSERT INTO entries (name, message, created_at) VALUES (?, ?, ?)"
            ).bind(name, message, new Date().toISOString()).run();

            return new Response("OK", { headers: CORS });
        }

        // Status: read
        if (url.pathname === "/status" && request.method === "GET") {
            const status = await getStatus(env);
            return Response.json(status, { headers: CORS });
        }

        // Status: write (authenticated)
        if (url.pathname === "/status" && request.method === "POST") {
            const auth = request.headers.get("Authorization") || "";
            if (!env.STATUS_TOKEN || auth !== `Bearer ${env.STATUS_TOKEN}`) {
                return new Response("Unauthorized", { status: 401, headers: CORS });
            }

            let body;
            try { body = await request.json(); }
            catch { return new Response("Bad request", { status: 400, headers: CORS }); }

            // Flat format from iPhone Shortcut: {key, artist, track} or {key, content}
            if (body.key) {
                const k = body.key;
                if (k === "music") {
                    const val = (body.artist || body.track)
                        ? { artist: body.artist || "", track: body.track || "" }
                        : null;
                    await setStatus(env, "music", val);
                } else if (k === "text") {
                    await setStatus(env, "text", body.content ? { content: body.content } : null);
                } else if (k === "clear") {
                    await setStatus(env, body.target, null);
                }
                return new Response("OK", { headers: CORS });
            }

            // Nested format from curl: {music: {artist, track}} etc.
            for (const key of ["music", "watching", "playing", "text"]) {
                if (key in body) await setStatus(env, key, body[key]);
            }

            return new Response("OK", { headers: CORS });
        }

        return new Response("Not found", { status: 404 });
    },

    // Cron: runs every 5 minutes, polls Trakt + Steam
    async scheduled(event, env, ctx) {
        ctx.waitUntil(Promise.all([pollTrakt(env), pollSteam(env)]));
    },
};
