// src/storage/index.js
import { LocalStorage } from "./local.js";
import { S3Storage } from "./s3.js";

let _storage = null;

export function getStorage() {
    if (_storage) return _storage;
    const driver = process.env.STORAGE_DRIVER || "local";
    _storage = driver === "s3" ? new S3Storage() : new LocalStorage();
    return _storage;
}
