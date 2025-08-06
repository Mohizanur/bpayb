import 'dotenv/config';
import { firestore } from "./firestore.js";
import fs from "fs/promises";

async function populateServices() {
  try {
    const services = JSON.parse(
      await fs.readFile(new URL("../services.json", import.meta.url))
    );
    for (const service of services) {
      await firestore.collection("services").doc(service.serviceID || service.id).set(service, { merge: true });
      console.log(`Added/updated service: ${service.name}`);
    }
    console.log("All services from services.json populated!");
    process.exit(0);
  } catch (err) {
    console.error("Error populating services:", err);
    process.exit(1);
  }
}

populateServices();