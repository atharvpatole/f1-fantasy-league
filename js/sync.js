const STORAGE_KEY = "f1-fantasy-league-state";

function isConfigured(value) {
    return typeof value === "string" && value.length > 0 && !value.includes("YOUR_");
}

function normalizeScores(scores, managerCount, trackCount) {
    const result = {};
    for (let m = 0; m < managerCount; m++) {
        const raw = scores?.[m] ?? scores?.[String(m)] ?? [];
        result[m] = Array.from({ length: trackCount }, (_, i) => {
            const val = raw[i] ?? raw[String(i)];
            return Number(val) || 0;
        });
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
    return {
        scores: normalizeScores(raw?.scores ?? {}, managerCount, trackCount),
        selections: normalizeSelections(raw?.selections ?? {}, managerCount, trackCount)
    };
}

export function createSyncManager(config = {}, managerCount = 3, trackCount = 14) {
    const appId = config.appId || "f1-fantasy-tracker-v1";
    let mode = "local";
    let supabaseClient = null;
    let firebaseCtx = null;
    let realtimeChannel = null;
    let firestoreUnsub = null;
    let onRemoteChange = null;
    let saveTimer = null;
    let lastSavedJson = "";

    function storageKey() {
        return `${STORAGE_KEY}:${appId}`;
    }

    function loadFromLocal() {
        try {
            const raw = localStorage.getItem(storageKey());
            if (!raw) return null;
            return normalizeState(JSON.parse(raw), managerCount, trackCount);
        } catch (e) {
            console.warn("Could not read local storage", e);
            return null;
        }
    }

    function saveToLocal(state) {
        const payload = JSON.stringify(state);
        if (payload === lastSavedJson) return;
        lastSavedJson = payload;
        localStorage.setItem(storageKey(), payload);
    }

    async function initSupabase() {
        const sb = config.supabase;
        if (!sb || !isConfigured(sb.url) || !isConfigured(sb.anonKey)) return false;

        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm");
        supabaseClient = createClient(sb.url, sb.anonKey);
        mode = "supabase";

        realtimeChannel = supabaseClient
            .channel(`league-${appId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "league_state", filter: `app_id=eq.${appId}` },
                (payload) => {
                    const row = payload.new;
                    if (!row || !onRemoteChange) return;
                    onRemoteChange(normalizeState(row, managerCount, trackCount));
                }
            )
            .subscribe();

        return true;
    }

    async function initFirebase() {
        const fb = config.firebase;
        if (!fb || !isConfigured(fb.projectId)) return false;

        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
        const { getFirestore, doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        const app = initializeApp(fb);
        const auth = getAuth(app);
        const db = getFirestore(app);
        await signInAnonymously(auth);

        const stateRef = doc(db, "artifacts", appId, "public", "data", "league_state");
        firestoreUnsub = onSnapshot(stateRef, (docSnap) => {
            if (!docSnap.exists() || !onRemoteChange) return;
            onRemoteChange(normalizeState(docSnap.data(), managerCount, trackCount));
        });

        firebaseCtx = { db, appId };
        mode = "firebase";
        return true;
    }

    async function init() {
        if (await initSupabase()) return mode;
        if (await initFirebase()) return mode;
        mode = "local";
        return mode;
    }

    async function load() {
        if (mode === "supabase") {
            const { data, error } = await supabaseClient
                .from("league_state")
                .select("scores, selections")
                .eq("app_id", appId)
                .maybeSingle();

            if (error) throw error;
            if (data) return normalizeState(data, managerCount, trackCount);
            return null;
        }

        if (mode === "firebase") {
            const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const db = getFirestore();
            const stateRef = doc(db, "artifacts", appId, "public", "data", "league_state");
            const snap = await getDoc(stateRef);
            if (snap.exists()) return normalizeState(snap.data(), managerCount, trackCount);
            return null;
        }

        return loadFromLocal();
    }

    async function persist(state) {
        saveToLocal(state);

        if (mode === "supabase") {
            const { error } = await supabaseClient.from("league_state").upsert(
                {
                    app_id: appId,
                    scores: state.scores,
                    selections: state.selections,
                    updated_at: new Date().toISOString()
                },
                { onConflict: "app_id" }
            );
            if (error) throw error;
            return;
        }

        if (mode === "firebase") {
            const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const db = getFirestore();
            const stateRef = doc(db, "artifacts", appId, "public", "data", "league_state");
            await setDoc(stateRef, { scores: state.scores, selections: state.selections }, { merge: true });
        }
    }

    function save(state, debounceMs = 400) {
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
                } catch (err) {
                    console.warn("Could not parse storage event", err);
                }
            });
        }
    }

    function getMode() {
        return mode;
    }

    function destroy() {
        clearTimeout(saveTimer);
        if (realtimeChannel && supabaseClient) supabaseClient.removeChannel(realtimeChannel);
        if (firestoreUnsub) firestoreUnsub();
    }

    return { init, load, save, subscribe, getMode, destroy, persist };
}
