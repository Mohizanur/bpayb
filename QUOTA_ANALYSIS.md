# Database Quota Analysis

## Per User Operations Breakdown

### **CUSTOM PLAN FLOW** (per completed user):
1. **User sends request** → 1 WRITE (`customPlanRequests.add`)
2. **Admin sets price** → 2 READS (`getPendingPayment`, `getCustomPlanRequest`) + 2 WRITES (`updatePendingPayment`, `updateCustomPlanRequest`)
3. **User clicks "Pay Now"** → 1 READ (`getPendingPayment`) + 0-1 READ (`getCustomPlanRequest` - conditional, only if needed)
4. **User provides details** → 0 DB operations (all in memory: name, email, phone)
5. **User uploads proof** → 2 WRITES (`pendingPayments.set`, `subscriptions.set`)
6. **Admin verifies** → 1 READ (`getPayment`) + 1 WRITE (`updatePayment`) + 1 WRITE (`updateSubscription`)

**Total per custom plan user:**
- READS: 4-5 reads
- WRITES: 6 writes

### **NORMAL PLAN FLOW** (per completed user):
1. **User selects plan** → 0 DB operations (in memory)
2. **User provides details** → 0 DB operations (in memory: name, email, phone)
3. **User uploads proof** → 2 WRITES (`pendingPayments.set`, `subscriptions.set`)
4. **Admin verifies** → 1 READ (`getPayment`) + 1 WRITE (`updatePayment`) + 1 WRITE (`updateSubscription`)

**Total per normal plan user:**
- READS: 1 read
- WRITES: 4 writes

---

## Daily Quota Calculation

### Assumptions:
- **1,000 users/day** completing subscriptions
- **5,000 users/day** completing subscriptions
- Mix: 80% normal plans, 20% custom plans (realistic ratio)

### **Scenario 1: 1,000 Users/Day**

**Normal Plans (800 users):**
- READS: 800 × 1 = **800 reads**
- WRITES: 800 × 4 = **3,200 writes**

**Custom Plans (200 users):**
- READS: 200 × 5 = **1,000 reads** (worst case)
- WRITES: 200 × 6 = **1,200 writes**

**TOTAL PER DAY:**
- **READS: 1,800 reads/day**
- **WRITES: 4,400 writes/day**

**Monthly (30 days):**
- **READS: 54,000 reads/month**
- **WRITES: 132,000 writes/month**

---

### **Scenario 2: 5,000 Users/Day**

**Normal Plans (4,000 users):**
- READS: 4,000 × 1 = **4,000 reads**
- WRITES: 4,000 × 4 = **16,000 writes**

**Custom Plans (1,000 users):**
- READS: 1,000 × 5 = **5,000 reads** (worst case)
- WRITES: 1,000 × 6 = **6,000 writes**

**TOTAL PER DAY:**
- **READS: 9,000 reads/day**
- **WRITES: 22,000 writes/day**

**Monthly (30 days):**
- **READS: 270,000 reads/month**
- **WRITES: 660,000 writes/month**

---

## Firebase Free Tier Limits:
- **50,000 reads/day** (1.5M/month)
- **20,000 writes/day** (600K/month)

## Firebase Blaze (Pay-as-you-go) Pricing:
- **$0.06 per 100,000 document reads**
- **$0.18 per 100,000 document writes**

---

## Cost Analysis (Blaze Plan):

### **1,000 Users/Day:**
- READS: 54,000/month × $0.06/100K = **$0.032/month**
- WRITES: 132,000/month × $0.18/100K = **$0.238/month**
- **Total: ~$0.27/month** ✅

### **5,000 Users/Day:**
- READS: 270,000/month × $0.06/100K = **$0.162/month**
- WRITES: 660,000/month × $0.18/100K = **$1.188/month**
- **Total: ~$1.35/month** ✅

---

## Key Optimizations Implemented:

1. ✅ **Zero-quota user details collection** - Name, email, phone stored in memory until proof upload
2. ✅ **Single DB write** - All user details written only once when proof is uploaded
3. ✅ **Conditional reads** - Custom plan request only read if details missing
4. ✅ **Caching** - Admin data, services, payment methods cached (6+ hours)
5. ✅ **Deferred operations** - Custom plan reads happen only when user clicks "Pay Now"

---

## Notes:
- These calculations assume **completed** subscriptions (user uploads proof)
- Users who browse but don't complete = **0 DB operations** (all in memory)
- Admin operations (viewing lists, etc.) use cached data (no extra quota)
- Cache hits = **0 DB operations**

