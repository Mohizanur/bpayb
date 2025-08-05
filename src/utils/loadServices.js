import fs from "fs/promises";

export async function loadServices() {
  try {
    return JSON.parse(
      await fs.readFile(new URL("../services.json", import.meta.url))
    );
  } catch (error) {
    console.error("Error loading services:", error);
    // Return empty array as fallback
    return [];
  }
}
