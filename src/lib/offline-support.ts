// Offline support utilities using IndexedDB

interface OfflineData {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

const DB_NAME = "family-portal-offline";
const STORE_NAME = "offline-data";

let db: IDBDatabase | null = null;

export async function initializeOfflineDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveOfflineData(
  type: string,
  data: any
): Promise<string> {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const offlineData: OfflineData = {
      id: `${type}-${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      synced: false,
    };

    const request = store.add(offlineData);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(offlineData.id);
  });
}

export async function getOfflineData(type?: string): Promise<OfflineData[]> {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const data = request.result as OfflineData[];
      if (type) {
        resolve(data.filter((d) => d.type === type));
      } else {
        resolve(data);
      }
    };
  });
}

export async function markAsSynced(id: string): Promise<void> {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result as OfflineData;
      data.synced = true;

      const updateRequest = store.put(data);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve();
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteOfflineData(id: string): Promise<void> {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearOfflineData(): Promise<void> {
  if (!db) await initializeOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Check if online
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// Listen for online/offline events
export function onOnlineStatusChange(callback: (isOnline: boolean) => void) {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => callback(true));
  window.addEventListener("offline", () => callback(false));

  return () => {
    window.removeEventListener("online", () => callback(true));
    window.removeEventListener("offline", () => callback(false));
  };
}
