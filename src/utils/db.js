const DB_NAME = 'ChessPuzzleDB';
const DB_VERSION = 2;
const STORE_NAME = 'puzzleResults';
const STATE_STORE = 'userState';

let cachedDB = null;
let dbAvailable = true;
let dbError = null;

export const isDBAvailable = () => {
    return dbAvailable && !dbError;
};

export const initDB = () => {
    if (cachedDB) return Promise.resolve(cachedDB);

    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            dbAvailable = false;
            dbError = 'IndexedDB is not supported';
            reject(new Error(dbError));
            return;
        }

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'puzzleId' });
                }
                if (!db.objectStoreNames.contains(STATE_STORE)) {
                    db.createObjectStore(STATE_STORE, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                cachedDB = event.target.result;
                dbAvailable = true;
                dbError = null;

                cachedDB.onversionchange = () => {
                    cachedDB.close();
                    cachedDB = null;
                };

                resolve(cachedDB);
            };

            request.onerror = (event) => {
                dbAvailable = false;
                dbError = event.target.error?.message || 'Failed to open IndexedDB';
                reject(new Error(dbError));
            };
        } catch (err) {
            dbAvailable = false;
            dbError = err.message;
            reject(err);
        }
    });
};

const getFromStore = async (storeName, key) => {
    if (!isDBAvailable()) return null;
    const db = await initDB();
    return new Promise((resolve) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
};

const putInStore = async (storeName, data) => {
    if (!isDBAvailable()) return;
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveResult = async (puzzleId, stars, xpGained) => {
    try {
        const existing = await getFromStore(STORE_NAME, puzzleId);
        const prevXP = existing ? (existing.xpGained || 0) : 0;
        const prevStars = existing ? (existing.stars || 0) : 0;

        await putInStore(STORE_NAME, {
            puzzleId,
            stars: Math.max(stars, prevStars),
            xpGained: xpGained,
            isCompleted: true,
            updatedAt: Date.now()
        });

        return { success: true, prevXP };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

export const getGlobalXP = async () => {
    const result = await getFromStore(STATE_STORE, 'totalXP');
    return result?.value || 0;
};

export const setGlobalXP = async (value) => {
    await putInStore(STATE_STORE, { key: 'totalXP', value });
};

export const getUserProfile = async () => {
    return await getFromStore(STATE_STORE, 'userProfile');
};

export const setUserProfile = async (profile) => {
    await putInStore(STATE_STORE, { ...profile, key: 'userProfile' });
};

export const getAllResults = async () => {
    if (!isDBAvailable()) return {};
    const db = await initDB();
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const results = {};
            request.result.forEach(item => {
                results[item.puzzleId] = item.stars;
            });
            resolve(results);
        };
        request.onerror = () => resolve({});
    });
};
