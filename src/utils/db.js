/**
 * Simple IndexedDB wrapper for tracking puzzle progress and stars.
 * Includes error handling for quota exceeded and availability checks.
 */
const DB_NAME = 'ChessPuzzleDB';
const DB_VERSION = 1;
const STORE_NAME = 'puzzleResults';

// Track database availability
let dbAvailable = true;
let dbError = null;

/**
 * Check if IndexedDB is available and working
 */
export const isDBAvailable = () => {
    return dbAvailable && !dbError;
};

/**
 * Get the last database error, if any
 */
export const getDBError = () => {
    return dbError;
};

/**
 * Initialize IndexedDB connection
 */
export const initDB = () => {
    return new Promise((resolve, reject) => {
        // Check if IndexedDB is available
        if (!window.indexedDB) {
            dbAvailable = false;
            dbError = 'IndexedDB is not supported in this browser';
            console.warn('IndexedDB not supported');
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
            };

            request.onsuccess = (event) => {
                dbAvailable = true;
                dbError = null;
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                dbAvailable = false;
                dbError = event.target.error?.message || 'Failed to open IndexedDB';
                console.error('IndexedDB open error:', dbError);
                reject(new Error(dbError));
            };

            request.onblocked = () => {
                dbError = 'IndexedDB is blocked by another connection';
                console.warn('IndexedDB blocked');
                reject(new Error(dbError));
            };
        } catch (err) {
            dbAvailable = false;
            dbError = err.message;
            console.error('IndexedDB initialization error:', err);
            reject(err);
        }
    });
};

/**
 * Save puzzle result with error handling
 */
export const saveResult = async (puzzleId, stars) => {
    if (!isDBAvailable()) {
        console.warn('Database not available, skipping save');
        return { success: false, error: dbError };
    }

    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Handle transaction errors (including quota exceeded)
            transaction.onerror = (event) => {
                const error = event.target.error;
                if (error?.name === 'QuotaExceededError') {
                    dbError = 'Storage quota exceeded';
                    console.error('IndexedDB quota exceeded');
                    reject(new Error('Storage quota exceeded. Please clear some browser data.'));
                } else {
                    reject(new Error(error?.message || 'Transaction failed'));
                }
            };

            const getRequest = store.get(puzzleId);

            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (!existing || stars > existing.stars) {
                    const putRequest = store.put({ puzzleId, stars, updatedAt: Date.now() });
                    putRequest.onsuccess = () => resolve({ success: true });
                    putRequest.onerror = (e) => reject(new Error(e.target.error?.message || 'Save failed'));
                } else {
                    resolve({ success: true, unchanged: true });
                }
            };

            getRequest.onerror = (e) => reject(new Error(e.target.error?.message || 'Get failed'));
        });
    } catch (err) {
        console.error('saveResult error:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Get all results with error handling
 */
export const getAllResults = async () => {
    if (!isDBAvailable()) {
        console.warn('Database not available, returning empty results');
        return {};
    }

    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
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

            request.onerror = (e) => {
                console.error('getAllResults error:', e);
                resolve({}); // Return empty on error to prevent app crash
            };
        });
    } catch (err) {
        console.error('getAllResults error:', err);
        return {}; // Return empty on error to prevent app crash
    }
};
