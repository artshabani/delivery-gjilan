# Quick Test Reference - Expected Outputs

## Test Scenarios Summary

| Test | Products | Time | Expected Store | Total Cost | Margin | Notes |
|------|----------|------|----------------|------------|--------|-------|
| 1 | Alpha × 2 | Day | Day Store A | €14.00 | €6.00 | Cheapest option |
| 1 | Alpha × 2 | Night | 24/7 Store D | €15.00 | €5.00 | Day stores closed |
| 2 | Epsilon × 1 | Any | 24/7 Store D | €15.00 | €5.00 | Only option |
| 3 | Alpha + Beta | Day | Day Store A | €19.00 | €6.50 | Single store, both cheapest |
| 3 | Alpha + Beta | Night | 24/7 Store D | €20.00 | €5.50 | Day stores closed |
| 4 | Alpha + Gamma | Day | 24/7 Store D | €14.00 | €4.75 | Single store preference (not cheapest split) |
| 5 | Beta | Night | 24/7 Store D | €12.50 | €3.00 | Cheaper than Night Store C (€13.00) |
| 6 | Alpha×2 + Delta + Gamma | Day | Day Store A or 24/7 D | €29-31 | €9.75-11.75 | Depends on store availability |

## Detailed Expected Outputs

### Test 1: Alpha × 2 (Day Hours 8 AM - 8 PM)
```
Stores Needed: 1
Total Wholesale Cost: €14.00
Total Customer Price: €20.00
Total Margin: €6.00

Cheapest Store Per Item:
  Alpha: Day Store A (€7.00)

Store Routes:
  Day Store A: Alpha × 2 @ €7.00 = €14.00
```

### Test 1: Alpha × 2 (Night Hours After 8 PM)
```
Stores Needed: 1
Total Wholesale Cost: €15.00
Total Customer Price: €20.00
Total Margin: €5.00

Cheapest Store Per Item:
  Alpha: 24/7 Store D (€7.50)

Store Routes:
  24/7 Store D: Alpha × 2 @ €7.50 = €15.00
```

### Test 2: Epsilon × 1 (Any Time)
```
Stores Needed: 1
Total Wholesale Cost: €15.00
Total Customer Price: €20.00
Total Margin: €5.00

Cheapest Store Per Item:
  Epsilon: 24/7 Store D (€15.00)

Store Routes:
  24/7 Store D: Epsilon × 1 @ €15.00 = €15.00
```

### Test 3: Alpha × 1 + Beta × 1 (Day Hours)
```
Stores Needed: 1
Total Wholesale Cost: €19.00
Total Customer Price: €25.50
Total Margin: €6.50

Cheapest Store Per Item:
  Alpha: Day Store A (€7.00)
  Beta: Day Store A (€12.00)

Store Routes:
  Day Store A: 
    Alpha × 1 @ €7.00
    Beta × 1 @ €12.00
    Total: €19.00
```

### Test 4: Alpha × 1 + Gamma × 1 (Day Hours)
```
Stores Needed: 1
Total Wholesale Cost: €14.00
Total Customer Price: €18.75
Total Margin: €4.75

Cheapest Store Per Item:
  Alpha: Day Store A (€7.00)  ← Cheapest for Alpha
  Gamma: Day Store B (€6.00) ← Cheapest for Gamma

Store Routes:
  24/7 Store D: 
    Alpha × 1 @ €7.50
    Gamma × 1 @ €6.50
    Total: €14.00

Note: System prefers single store (€14.00) over split (€13.00) to save time/fuel
```

### Test 5: Beta × 1 (Night Hours)
```
Stores Needed: 1
Total Wholesale Cost: €12.50
Total Customer Price: €15.50
Total Margin: €3.00

Cheapest Store Per Item:
  Beta: 24/7 Store D (€12.50)

Store Routes:
  24/7 Store D: Beta × 1 @ €12.50 = €12.50

Note: 24/7 Store D (€12.50) is cheaper than Night Store C (€13.00)
```

### Test 6: Alpha × 2 + Delta × 1 + Gamma × 1 (Day Hours)
```
Stores Needed: 1
Total Wholesale Cost: €29.00 (if Day Store A has all) OR €31.00 (if using 24/7 Store D)
Total Customer Price: €40.75
Total Margin: €11.75 OR €9.75

Cheapest Store Per Item:
  Alpha: Day Store A (€7.00)
  Delta: Day Store A (€9.00)
  Gamma: Day Store B (€6.00)

Store Routes:
  Day Store A (if has all): €29.00
  OR
  24/7 Store D (if Day Store A missing Gamma): €31.00
```

## Key Points

1. **Cheapest Store Per Item** shows the actual cheapest option for each product individually
2. **Store Routes** may use a different store if single-store fulfillment is possible (saves time/fuel)
3. **Day stores** (A, B) only available 8 AM - 8 PM
4. **Night Store C** only available after 8 PM
5. **24/7 Store D** always available
6. **Closed Store E** never available

## Verification

Run diagnostic endpoint to check store availability:
```
GET /api/admin/stores/diagnostic
```

This shows which stores are currently open and why.




