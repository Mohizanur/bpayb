import 'dotenv/config';
import { firestore } from "./firestore.js";

async function printServices() {
  try {
    const snapshot = await firestore.collection("services").get();
    if (!snapshot.empty) {
      console.log("Services in Firestore:");
      snapshot.docs.forEach(doc => {
        console.log(doc.id, doc.data());
      });
    } else {
      console.log("No services found in Firestore.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Error reading services:", err);
    process.exit(1);
  }
}

printServices();