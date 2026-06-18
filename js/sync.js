const STORAGE_KEY = "f1-fantasy-league-state";
const POLL_MS = 1000;

function normalizeScores(scores, managerCount, trackCount) {
    const result = {};
    for (let m = 0; m < managerCount; m++) {
        const raw = scores?.[m] ?? scores?.[String(m)] ?? [];
        result[m] = Array.from({ length: trackCount }, (_, i) => Number(raw[i] ?? raw[String(i)]) || 0);
    }
    return result;
}

function normalizeSelections(selections, managerCount, trackCount) {
    const result = {};
    for (let m = 0; m < managerCount; m++) {
        const rawTracks = selections?.[m] ?? selections?.[String(m)] ?? [];
        result[m] = Array.from({ length: trackCount }, (_, t) => {
            const track = rawTracks[t] ?? rawTracks[String(t)] ?? {};
            return typeof track === "object" && track !== null ? { ...track } : {};
        });
    }
    return result;
}

export function normalizeState(raw, managerCount, trackCount) {
    if (!raw) return null;
    return {
        scores: normalizeScores(raw.scores ?? {}, managerCount, trackCount),
        selections: normalizeSelections(raw.selections ?? {}, managerCount, trackCount)
    };
}

export function createSyncManager(config = {}, managerCount = 4, trackCount = 14) {
    const appId = config.appId || "f1-fantasy-tracker-v1";
    let mode = "local";
    let onRemoteChange = null;
    let saveTimer = null;
    let pollTimer = null;
    let lastSeenAt = 0;
    let lastSavedJson = "";

    const apiUrl = `/api/league?appId=${encodeURIComponent(appId)}`;

    function storageKey() {
        return `${STORAGE_KEY}:${appId}`;
    }

    function stateFingerprint(state) {
        return JSON.stringify({ scores: state.scores, selections: state.selections });
    }

    function saveToLocal(state) {
        const payload = stateFingerprint(state);
        if (payload === lastSavedJson) return;
        lastSavedJson = payload;
        localStorage.setItem(storageKey(), payload);
    }

    function loadFromLocal() {
        try {
            const raw = localStorage.getItem(storageKey());
            return raw ? normalizeState(JSON.parse(raw), managerCount, trackCount) : null;
        } catch {
            return null;
        }
    }

    async function initCloud() {
        try {
            const res = await fetch(apiUrl, { method: "GET", cache: "no-store" });
            if (!res.ok) return false;
            mode = "cloud";
            return true;
        } catch {
            return false;
        }
    }

    async function load() {
        if (mode === "cloud") {
            const res = await fetch(apiUrl, { method: "GET", cache: "no-store" });
            if (!res.ok) throw new Error("Load failed");
            const data = await res.json();
            if (data?.updatedAt) lastSeenAt = data.updatedAt;
            return normalizeState(data, managerCount, trackCount);
        }
        return loadFromLocal();
    }

    async function persist(state) {
        saveToLocal(state);
        if (mode !== "cloud") return;

        const res = await fetch("/api/league", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId, scores: state.scores, selections: state.selections })
        });
        if (!res.ok) throw new Error("Save failed");
        const result = await res.json();
        if (result?.updatedAt) lastSeenAt = result.updatedAt;
    }

    function save(state, debounceMs = 300) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            persist(state).catch((e) => console.error("Save failed:", e));
        }, debounceMs);
    }

    function subscribe(callback) {
        onRemoteChange = callback;

        if (mode === "local") {
            window.addEventListener("storage", (e) => {
                if (e.key !== storageKey() || !e.newValue) return;
                try {
                    callback(normalizeState(JSON.parse(e.newValue), managerCount, trackCount));
                } catch { /* ignore */ }
            });
            return;
        }

        pollTimer = setInterval(async () => {
            try {
                const res = await fetch(apiUrl, { method: "GET", cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (!data) return;
                if (data.updatedAt && data.updatedAt <= lastSeenAt) return;
                if (data.updatedAt) lastSeenAt = data.updatedAt;
                callback(normalizeState(data, managerCount, trackCount));
            } catch { /* ignore */ }
        }, POLL_MS);
    }

    async function init() {
        if (await initCloud()) return mode;
        mode = "local";
        return mode;
    }

    function getMode() {
        return mode;
    }

    function destroy() {
        clearTimeout(saveTimer);
        clearInterval(pollTimer);
    }

    return { init, load, save, subscribe, getMode, destroy, persist };
}
