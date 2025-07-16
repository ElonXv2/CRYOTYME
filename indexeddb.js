// indexeddb.js - Full IndexedDB logic

let db;
const DB_NAME = 'BankAppDB';
const STORE_NAME = 'users';

function initDB() {
  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'username' });
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    console.log('IndexedDB ready');
    window.dispatchEvent(new Event('db-ready'));
  };

  request.onerror = (e) => {
    console.error('DB error:', e.target.errorCode);
  };
}

function saveUser(user) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(user);
}

function getUser(username) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(username);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteUser(username) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(username);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

initDB();