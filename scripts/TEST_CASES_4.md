# 4 Focused Test Cases

## Test Case 1: Single Store - All Items Available
**Scenario:** All products can be found in one store (Day Store A)
**Goal:** Test single-store fulfillment

**Products:**
- Milk 1L × 2
- Bread White × 1
- Chicken 1kg × 1
- Tomatoes 1kg × 1

**Expected:**
- **Option 1 (Recommended):** Day Store A - All items (€13.10 wholesale, €18.30 profit)
- **Option 2:** Split between stores for maximum profit (€12.90 wholesale, €18.50 profit - +€0.20)

**Why:** Day Store A has all 4 products. Option 2 splits to get cheaper prices from other stores.

---

## Test Case 2: Must Split - Product Only in One Store
**Scenario:** One product (Cooking Oil) is only available in 24/7 Store E
**Goal:** Test forced multi-store scenario

**Products:**
- Milk 1L × 1
- Bread White × 1
- Cooking Oil 1L × 1 (only in Store E)

**Expected (Current Behavior):**
- **Option 1:** 24/7 Store E - All items (€6.60 wholesale, €2.20 profit)
  - System picks single store since Store E has all products
  - Milk: €2.10, Bread: €1.30, Oil: €3.20

**Note:** This is NOT optimal! Could save €0.45 by splitting:
- **Optimal Split:** Store A (Milk €1.80) + Store B (Bread €1.15) + Store E (Oil €3.20) = €6.15
- But system prioritizes single-store fulfillment over cost optimization

---

## Test Case 3: Maximum Profit Split
**Scenario:** Products have different cheapest stores
**Goal:** Test profit optimization across multiple stores

**Products:**
- Bread White × 2 (cheapest in Store B)
- Eggs 12pcs × 1 (cheapest in Store C)
- Rice 1kg × 1 (cheapest in Store B)
- Pasta 500g × 1 (cheapest in Store C)
- Onions 1kg × 1 (cheapest in Store B)

**Expected:**
- **Option 1:** 24/7 Store E - All items (€9.20 wholesale, €4.30 profit)
- **Option 2:** Split - Store B for Bread/Rice/Onions, Store C for Eggs/Pasta (€6.50 wholesale, €7.00 profit - +€2.70)

**Why:** Products are cheapest in different stores. Option 2 maximizes profit by splitting.

---

## Test Case 4: Night Scenario - Limited Stores
**Scenario:** Testing during night hours (after 11 PM)
**Goal:** Test with only 2 stores open (Night Store D and 24/7 Store E)

**Products:**
- Milk 1L × 1
- Bread White × 1
- Eggs 12pcs × 1

**Expected (Night Hours):**
- **Option 1:** 24/7 Store E - All items (€5.90 wholesale, €1.60 profit)
- **Option 2:** If Night Store D has any products, compare costs

**Why:** During night, only Store E is open (Night Store D might not have these products). System should handle limited availability.

---

## Test Case Summary Table

| Test | Products | Single Store? | Expected Stores | Profit Difference |
|------|----------|---------------|-----------------|-------------------|
| 1 | Milk×2, Bread, Chicken, Tomatoes | Yes (Store A) | Store A or Split | +€0.20 if split |
| 2 | Milk, Bread, Cooking Oil | No (Oil only in E) | Store E or Split | +€0.45 if split |
| 3 | Bread×2, Eggs, Rice, Pasta, Onions | Yes (Store E) | Store E or Split | +€2.70 if split |
| 4 | Milk, Bread, Eggs (Night) | Yes (Store E) | Store E only | N/A |

