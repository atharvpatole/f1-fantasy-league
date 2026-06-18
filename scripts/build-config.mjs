import { writeFileSync } from "fs";

const config = {
    appId: process.env.APP_ID || "f1-fantasy-tracker-v1",
    supabase: {
        url: process.env.SUPABASE_URL || "",
        anonKey: process.env.SUPABASE_ANON_KEY || ""
    }
};

if (process.env.FIREBASE_API_KEY) {
    config.firebase = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || ""
    };
}

writeFileSync("config.js", `window.APP_CONFIG = ${JSON.stringify(config, null, 4)};\n`);
console.log("Generated config.js for deployment");
