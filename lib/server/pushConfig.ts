// ============================================================
// Server-side Web Push (VAPID) Configuration & Key Management
// Automatically uses environment variables or persists keys in .data/
// ============================================================

import webpush from "web-push";
import fs from "node:fs";
import path from "node:path";

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const DEFAULT_SUBJECT = "mailto:admin@au75.vercel.app";

let cachedKeys: VapidKeys | null = null;
let webPushInitialized = false;

function getVapidFilePath(): string {
  const baseDir = path.join(process.cwd(), ".data");
  return path.join(baseDir, "vapid_keys.json");
}

/**
 * Retrieve VAPID keys.
 * 1. Checks NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
 * 2. If not found in env, checks .data/vapid_keys.json.
 * 3. If still not found, generates and persists a valid keypair so it works out-of-the-box.
 */
export function getVapidKeys(): VapidKeys {
  if (cachedKeys) return cachedKeys;

  // 1. Check environment variables
  const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;

  if (envPub && envPriv) {
    cachedKeys = {
      publicKey: envPub.trim(),
      privateKey: envPriv.trim(),
    };
    return cachedKeys;
  }

  // 2. Check local disk .data/vapid_keys.json
  try {
    const filePath = getVapidFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.publicKey && parsed.privateKey) {
        cachedKeys = {
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
        };
        return cachedKeys;
      }
    }
  } catch {
    // Ignore read errors
  }

  // 3. Generate new VAPID keys
  const generated = webpush.generateVAPIDKeys();
  cachedKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  };

  try {
    const filePath = getVapidFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(cachedKeys, null, 2), "utf-8");
  } catch {
    // Ignore write errors (e.g. read-only filesystem)
  }

  return cachedKeys;
}

/**
 * Ensure webpush is initialized with VAPID details before sending messages.
 */
export function initWebPush(): void {
  const keys = getVapidKeys();
  const subject = process.env.VAPID_SUBJECT || DEFAULT_SUBJECT;
  webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  webPushInitialized = true;
}

export function getWebPushInstance(): typeof webpush {
  if (!webPushInitialized) {
    initWebPush();
  }
  return webpush;
}

/** Reset cached keys (useful for unit tests) */
export function resetVapidCache(): void {
  cachedKeys = null;
  webPushInitialized = false;
}
