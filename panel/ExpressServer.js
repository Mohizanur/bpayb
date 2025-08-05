import "dotenv/config";
import express from "express";
import { firestore } from "../src/utils/firestore.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../public")));

app.get("/panel", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/api/pending", async (req, res) => {
  if (req.query.admin !== ADMIN_TELEGRAM_ID)
    return res.status(403).send("Forbidden");
  const subs = await firestore
    .collection("subscriptions")
    .where("status", "==", "pending")
    .get();
  res.json(subs.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});

app.post("/api/approve", async (req, res) => {
  if (req.body.admin !== ADMIN_TELEGRAM_ID)
    return res.status(403).send("Forbidden");
  const { id, nextBillingDate } = req.body;
  await firestore.collection("subscriptions").doc(id).update({
    status: "active",
    nextBillingDate,
  });
  res.json({ ok: true });
});

app.listen(3001, () => console.log("Admin panel running on 3001"));
