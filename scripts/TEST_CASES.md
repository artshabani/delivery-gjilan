# Store Selection System - Test Cases & Expected Outputs

## Test Data Setup

**Stores:**
- **Day Store A**: 08:00-20:00 (Alpha: €7.00, Beta: €12.00, Delta: €9.00)
- **Day Store B**: 09:00-18:00 (Alpha: €8.00, Gamma: €6.00, Delta: €10.00)
- **Night Store C**: 20:00-06:00 (Beta: €13.00, Delta: €10.50)
- **24/7 Store D**: Always open (Alpha: €7.50, Beta: €12.50, Gamma: €6.50, Delta: €9.50, Epsilon: €15.00)
- **Closed Store E**: Always closed (override = false)

**Products:**
- **Test Product Alpha**: €10.00 customer price
- **Test Product Beta**: €15.50 customer price
- **Test Product Gamma**: €8.75 customer price
- **Test Product Delta**: €12.00 customer price
- **Test Product Epsilon**: €20.00 customer price

---

## Test Case 1: Single Product, Multiple Stores (Day Hours)

**Input:**
- Test Product Alpha × 2

**Expected Output (8 AM - 8 PM):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €14.00
  Total Customer Price: €20.00
  Total Margin: €6.00

Cheapest Store Per Item:
  Test Product Alpha: Day Store A (€7.00)

Store Routes:
  Store: Day Store A (ID: [store_id])
    Cost: €14.00
    Test Product Alpha × 2: €7.00 each
```

**Expected Output (After 8 PM):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €15.00
  Total Customer Price: €20.00
  Total Margin: €5.00

Cheapest Store Per Item:
  Test Product Alpha: 24/7 Store D (€7.50)

Store Routes:
  Store: 24/7 Store D (ID: [store_id])
    Cost: €15.00
    Test Product Alpha × 2: €7.50 each
```

---

## Test Case 2: Product Only in One Store

**Input:**
- Test Product Epsilon × 1

**Expected Output (Any Time):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €15.00
  Total Customer Price: €20.00
  Total Margin: €5.00

Cheapest Store Per Item:
  Test Product Epsilon: 24/7 Store D (€15.00)

Store Routes:
  Store: 24/7 Store D (ID: [store_id])
    Cost: €15.00
    Test Product Epsilon × 1: €15.00 each
```

---

## Test Case 3: Multiple Products, Single Store Can Fulfill (Day Hours)

**Input:**
- Test Product Alpha × 1
- Test Product Beta × 1

**Expected Output (8 AM - 8 PM):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €19.00
  Total Customer Price: €25.50
  Total Margin: €6.50

Cheapest Store Per Item:
  Test Product Alpha: Day Store A (€7.00)
  Test Product Beta: Day Store A (€12.00)

Store Routes:
  Store: Day Store A (ID: [store_id])
    Cost: €19.00
    Test Product Alpha × 1: €7.00 each
    Test Product Beta × 1: €12.00 each
```

**Note:** Day Store A has both products and is the cheapest for both, so single-store fulfillment is optimal.

**Expected Output (After 8 PM):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €20.00
  Total Customer Price: €25.50
  Total Margin: €5.50

Cheapest Store Per Item:
  Test Product Alpha: 24/7 Store D (€7.50)
  Test Product Beta: 24/7 Store D (€12.50)

Store Routes:
  Store: 24/7 Store D (ID: [store_id])
    Cost: €20.00
    Test Product Alpha × 1: €7.50 each
    Test Product Beta × 1: €12.50 each
```

---

## Test Case 4: Multiple Products, Different Cheapest Stores (Day Hours)

**Input:**
- Test Product Alpha × 1
- Test Product Gamma × 1

**Expected Output (8 AM - 8 PM):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €14.00
  Total Customer Price: €18.75
  Total Margin: €4.75

Cheapest Store Per Item:
  Test Product Alpha: Day Store A (€7.00)
  Test Product Gamma: Day Store B (€6.00)

Store Routes:
  Store: 24/7 Store D (ID: [store_id])
    Cost: €14.00
    Test Product Alpha × 1: €7.50 each
    Test Product Gamma × 1: €6.50 each
```

**Note:** 
- Cheapest per item: Alpha from Day Store A (€7.00), Gamma from Day Store B (€6.00) = €13.00 total
- But system prefers single store: 24/7 Store D (€14.00 total)
- This is by design to save time/fuel (single trip vs two trips)

**Alternative Possible Output (if Day Store A or B has both):**
If Day Store A or B has both products, it would use that store instead.

---

## Test Case 5: Night Store Selection

**Input:**
- Test Product Beta × 1

**Expected Output (After 8 PM, Before 6 AM):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €12.50
  Total Customer Price: €15.50
  Total Margin: €3.00

Cheapest Store Per Item:
  Test Product Beta: 24/7 Store D (€12.50)

Store Routes:
  Store: 24/7 Store D (ID: [store_id])
    Cost: €12.50
    Test Product Beta × 1: €12.50 each
```

**Note:** 
- Night Store C has Beta at €13.00
- 24/7 Store D has Beta at €12.50 (cheaper)
- System should select 24/7 Store D, not Night Store C

---

## Test Case 6: Complex Multi-Product, Multi-Store (Day Hours)

**Input:**
- Test Product Alpha × 2
- Test Product Delta × 1
- Test Product Gamma × 1

**Expected Output (8 AM - 8 PM):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €29.00
  Total Customer Price: €40.75
  Total Margin: €11.75

Cheapest Store Per Item:
  Test Product Alpha: Day Store A (€7.00)
  Test Product Delta: Day Store A (€9.00)
  Test Product Gamma: Day Store B (€6.00)

Store Routes:
  Store: Day Store A (ID: [store_id])
    Cost: €29.00
    Test Product Alpha × 2: €7.00 each
    Test Product Delta × 1: €9.00 each
    Test Product Gamma × 1: [Price from Day Store A if available, or from 24/7 Store D]
```

**Note:** 
- If Day Store A has all 3 products, it will use Day Store A
- If Day Store A doesn't have Gamma, it will use 24/7 Store D (which has all products)
- The system prefers single-store fulfillment

**Alternative Output (if Day Store A doesn't have Gamma):**

```
Summary:
  Stores Needed: 1
  Total Wholesale Cost: €31.00
  Total Customer Price: €40.75
  Total Margin: €9.75

Cheapest Store Per Item:
  Test Product Alpha: Day Store A (€7.00)
  Test Product Delta: Day Store A (€9.00)
  Test Product Gamma: Day Store B (€6.00)

Store Routes:
  Store: 24/7 Store D (ID: [store_id])
    Cost: €31.00
    Test Product Alpha × 2: €7.50 each
    Test Product Delta × 1: €9.50 each
    Test Product Gamma × 1: €6.50 each
```

---

## Test Case 7: Multiple Stores Required (No Single Store Has All)

**Input:**
- Test Product Alpha × 1
- Test Product Gamma × 1
- Test Product Epsilon × 1

**Expected Output (8 AM - 8 PM):**

```
Summary:
  Stores Needed: 2
  Total Wholesale Cost: €28.50
  Total Customer Price: €38.75
  Total Margin: €10.25

Cheapest Store Per Item:
  Test Product Alpha: Day Store A (€7.00)
  Test Product Gamma: Day Store B (€6.00)
  Test Product Epsilon: 24/7 Store D (€15.00)

Store Routes:
  Store: Day Store A (ID: [store_id])
    Cost: €7.00
    Test Product Alpha × 1: €7.00 each
  
  Store: 24/7 Store D (ID: [store_id])
    Cost: €21.50
    Test Product Gamma × 1: €6.50 each
    Test Product Epsilon × 1: €15.00 each
```

**Note:** 
- Epsilon is only in Store D
- Alpha cheapest in Day Store A
- Gamma cheapest in Day Store B
- System uses minimum store combination (greedy algorithm)
- May combine Gamma + Epsilon in Store D to minimize store count

---

## Test Case 8: Empty Cart

**Input:**
- (No products selected)

**Expected Output:**

```
Summary:
  Stores Needed: 0
  Total Wholesale Cost: €0.00
  Total Customer Price: €0.00
  Total Margin: €0.00

Cheapest Store Per Item:
  (empty)

Store Routes:
  (empty)
```

---

## Test Case 9: Product with No Open Stores

**Input:**
- Test Product Alpha × 1 (when all stores are closed)

**Expected Output:**

```
Error or empty result:
  - No stores available
  - Or cheapest_store_per_item may be empty
  - store_route_plan will be empty
```

---

## Verification Checklist

For each test, verify:

✅ **Store Selection:**
- Only open stores are considered
- Cheapest store is selected for each product (in cheapest_store_per_item)
- Single-store fulfillment is preferred when possible

✅ **Costs:**
- Total wholesale cost matches sum of route costs
- Total customer price = sum of (product price × quantity)
- Total margin = total customer price - total wholesale cost

✅ **Time-Dependent Behavior:**
- Day stores (A, B) only appear during 8 AM - 8 PM
- Night Store C only appears after 8 PM
- 24/7 Store D always appears
- Closed Store E never appears

✅ **Route Plan:**
- Matches or is more efficient than cheapest per item (due to single-store preference)
- All products in cart are included
- Quantities are correct

---

## Diagnostic Endpoint

To verify store availability, check:
```
GET /api/admin/stores/diagnostic
```

This shows:
- Current time (server UTC and Gjilan local)
- Status of all stores (open/closed with reason)
- Which stores are considered open
- Time calculations for debugging

---

## Common Issues to Watch For

1. **Timezone Issues:**
   - If day stores aren't selected during day hours, check diagnostic endpoint
   - Verify server timezone vs Gjilan timezone

2. **Wrong Cheapest Store:**
   - Check that cheapest_store_per_item shows actual cheapest
   - Route plan may differ (single-store preference)

3. **Missing Products:**
   - Verify product-store links exist
   - Verify wholesale prices exist
   - Check that stores are actually open

4. **24/7 Store Not Always Open:**
   - Should always be open regardless of time
   - Check if opens_at = '00:00:00' and closes_at = '23:59:59'




