// Copy to config.js and fill in ONE cloud option (or leave empty for local-only mode).
// Local-only still persists across refreshes on the same browser — no cost, no account.

window.APP_CONFIG = {
    appId: "f1-fantasy-tracker-v1",

    // Option A (recommended, free): Supabase — real-time sync for all 3 players
    // 1. Create project at https://supabase.com
    // 2. Run supabase-setup.sql in the SQL editor
    // 3. Paste Project URL + anon public key below
    supabase: {
        url: "https://YOUR_PROJECT.supabase.co",
        anonKey: "YOUR_SUPABASE_ANON_KEY"
    }

    // Option B (optional): Firebase — uncomment and fill if you already use Firebase
    // firebase: {
    //     apiKey: "YOUR_API_KEY",
    //     authDomain: "YOUR_PROJECT.firebaseapp.com",
    //     projectId: "YOUR_PROJECT_ID",
    //     storageBucket: "YOUR_PROJECT.appspot.com",
    //     messagingSenderId: "YOUR_SENDER_ID",
    //     appId: "YOUR_APP_ID"
    // }
};
