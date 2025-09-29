#!/usr/bin/env node

/**
 * Debug Services Script
 * This script helps debug service loading issues
 */

import { loadServices } from "./src/utils/loadServices.js";
import { cache } from "./src/utils/cache.js";

console.log("🔍 Debugging Services Loading...\n");

async function debugServices() {
  try {
    console.log("1. Loading services from source...");
    const services = await loadServices();
    console.log(`   ✅ Loaded ${services.length} services`);

    if (services.length > 0) {
      console.log("\n2. Service details:");
      services.forEach((service, index) => {
        console.log(
          `   ${index + 1}. ID: ${service.id || service.serviceID || "NO_ID"}`
        );
        console.log(`      Name: ${service.name || "NO_NAME"}`);
        console.log(
          `      Plans: ${service.plans ? service.plans.length : 0} plans`
        );
        console.log("");
      });
    }

    console.log("3. Checking cache...");
    const cachedServices = cache.getServices();
    console.log(
      `   Cache has ${cachedServices ? cachedServices.length : 0} services`
    );

    if (cachedServices && cachedServices.length > 0) {
      console.log("\n4. Cached service details:");
      cachedServices.forEach((service, index) => {
        console.log(
          `   ${index + 1}. ID: ${service.id || service.serviceID || "NO_ID"}`
        );
        console.log(`      Name: ${service.name || "NO_NAME"}`);
        console.log("");
      });
    }

    console.log("\n5. Testing service ID matching...");
    if (services.length > 0) {
      const testService = services[0];
      const testId = testService.id || testService.serviceID;
      console.log(`   Testing with service ID: ${testId}`);

      const foundService = services.find(
        (s) =>
          s.id === testId ||
          s.serviceID === testId ||
          s.id?.toLowerCase() === testId?.toLowerCase() ||
          s.serviceID?.toLowerCase() === testId?.toLowerCase()
      );

      console.log(`   Found service: ${foundService ? "YES" : "NO"}`);
      if (foundService) {
        console.log(`   Found service name: ${foundService.name}`);
      }
    }
  } catch (error) {
    console.error("❌ Error debugging services:", error);
  }
}

debugServices();
