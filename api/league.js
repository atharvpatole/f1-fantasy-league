import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function key(appId) {
    return `league:${appId}`;
}

export default async function handler(req, res) {
    const appId = req.query?.appId || req.body?.appId || "f1-fantasy-tracker-v1";

    res.setHeader("Cache-Control", "no-store");

    if (req.method === "GET") {
        const data = await redis.get(key(appId));
        return res.status(200).json(data || null);
    }

    if (req.method === "POST") {
        const { scores, selections } = req.body || {};
        if (!scores || !selections) {
            return res.status(400).json({ error: "Missing scores or selections" });
        }
        const updatedAt = Date.now();
        const payload = { scores, selections, updatedAt };
        await redis.set(key(appId), payload);
        return res.status(200).json({ ok: true, updatedAt });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
}
