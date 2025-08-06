import 'dotenv/config';
import { firestore } from "./firestore.js";

const services = [
  {
    serviceID: "netflix",
    name: "Netflix",
    description: "Watch unlimited movies and TV shows online on Netflix.",
    price: 350,
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    isActive: true
  },
  {
    serviceID: "prime",
    name: "Amazon Prime Video",
    description: "Stream and download popular movies and TV shows from Amazon Prime.",
    price: 320,
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png",
    isActive: true
  },
  {
    serviceID: "spotify",
    name: "Spotify",
    description: "Listen to millions of songs and podcasts on Spotify.",
    price: 180,
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
    isActive: true
  },
  {
    serviceID: "disney",
    name: "Disney+",
    description: "Stream Disney, Pixar, Marvel, Star Wars, and National Geographic.",
    price: 300,
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
    isActive: true
  },
  {
    serviceID: "youtube",
    name: "YouTube Premium",
    description: "Enjoy ad-free videos and music with YouTube Premium.",
    price: 200,
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
    isActive: true
  }
];

async function populateServices() {
  for (const service of services) {
    await firestore.collection("services").doc(service.serviceID).set(service, { merge: true });
    console.log(`Added/updated service: ${service.name}`);
  }
  console.log("All services populated!");
  process.exit(0);
}

populateServices().catch(err => {
  console.error("Error populating services:", err);
  process.exit(1);
});