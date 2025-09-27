import { openDB } from "idb";

const DB_NAME = "attenomics-chat";
const DB_VERSION = 1;
const CHAT_SESSIONS_STORE = "chatSessions";
const SIDEBAR_STATE_STORE = "sidebarState";

// Initialize the database
const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores
      if (!db.objectStoreNames.contains(CHAT_SESSIONS_STORE)) {
        db.createObjectStore(CHAT_SESSIONS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SIDEBAR_STATE_STORE)) {
        db.createObjectStore(SIDEBAR_STATE_STORE, { keyPath: "id" });
      }
    },
  });
};

// Chat Sessions Operations
export const chatStorage = {
  async getAllSessions() {
    const db = await initDB();
    const sessions = await db.getAll(CHAT_SESSIONS_STORE);

    // Filter out sessions with invalid IDs to prevent future errors
    return sessions.filter(
      (session) =>
        session &&
        session.id &&
        typeof session.id === "string" &&
        session.id.trim() !== ""
    );
  },

  async getSession(id) {
    const db = await initDB();
    return db.get(CHAT_SESSIONS_STORE, id);
  },

  async saveSession(session) {
    const db = await initDB();

    // Validate session has a valid ID
    if (
      !session ||
      !session.id ||
      typeof session.id !== "string" ||
      session.id.trim() === ""
    ) {
      throw new Error("Session must have a valid string ID");
    }

    // Ensure ID is a clean string
    const cleanSession = {
      ...session,
      id: session.id.toString().trim(),
    };

    return db.put(CHAT_SESSIONS_STORE, cleanSession);
  },

  async saveAllSessions(sessions) {
    const db = await initDB();
    const tx = db.transaction(CHAT_SESSIONS_STORE, "readwrite");

    // Filter out sessions with invalid IDs and ensure all sessions have valid IDs
    const validSessions = sessions
      .filter(
        (session) =>
          session &&
          session.id &&
          typeof session.id === "string" &&
          session.id.trim() !== ""
      )
      .map((session) => ({
        ...session,
        id: session.id.toString().trim(),
      }));

    await Promise.all([
      ...validSessions.map((session) => tx.store.put(session)),
      tx.done,
    ]);
  },

  async deleteSession(id) {
    const db = await initDB();
    return db.delete(CHAT_SESSIONS_STORE, id);
  },

  async clearAllSessions() {
    const db = await initDB();
    return db.clear(CHAT_SESSIONS_STORE);
  },

  async cleanupCorruptedSessions() {
    const db = await initDB();
    const allSessions = await db.getAll(CHAT_SESSIONS_STORE);

    // Find sessions with invalid IDs
    const corruptedSessions = allSessions.filter(
      (session) =>
        !session ||
        !session.id ||
        typeof session.id !== "string" ||
        session.id.trim() === ""
    );

    // Delete corrupted sessions
    const tx = db.transaction(CHAT_SESSIONS_STORE, "readwrite");
    await Promise.all([
      ...corruptedSessions.map((session) =>
        tx.store.delete(session.id || "invalid")
      ),
      tx.done,
    ]);

    return corruptedSessions.length;
  },
};

// Sidebar State Operations
export const sidebarStorage = {
  async getState() {
    const db = await initDB();
    const state = await db.get(SIDEBAR_STATE_STORE, "sidebar");
    return state?.collapsed ?? false;
  },

  async saveState(collapsed) {
    const db = await initDB();
    return db.put(SIDEBAR_STATE_STORE, { id: "sidebar", collapsed });
  },
};
