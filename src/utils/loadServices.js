import fs from "fs/promises";

export async function loadServices() {
  return JSON.parse(
    await fs.readFile(new URL("../services.json", import.meta.url))
  );
}
