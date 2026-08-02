import path from "node:path";

import { createLocalStorage } from "./local.js";
import { createR2Storage } from "./r2.js";

let storageInstance;

export function getResourceStorage() {
  if (storageInstance) return storageInstance;

  const driver = process.env.RESOURCE_STORAGE_DRIVER || "local";
  if (driver === "r2") {
    storageInstance = createR2Storage();
    return storageInstance;
  }
  if (driver !== "local") {
    throw new Error(`Unsupported resource storage driver: ${driver}`);
  }

  storageInstance = createLocalStorage({
    root: process.env.RESOURCE_STORAGE_PATH || path.join(process.cwd(), ".data", "resources"),
  });
  return storageInstance;
}

export function resetResourceStorageForTests() {
  storageInstance = undefined;
}
