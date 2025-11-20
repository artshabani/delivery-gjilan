# Setup Instructions for Test Cases

## Step 1: Reset Test Data

1. Open Supabase SQL Editor
2. Copy and paste the entire contents of `scripts/reset-test-data.sql`
3. Run the script
4. Verify the data was created by running the verification query at the bottom of the script

## Step 2: Test the UI

1. Go to `/admin/store-planning` in your app
2. You'll see 4 test case buttons at the top:
   - **Test 1: Single Store - All Available**
   - **Test 2: Must Split - Exclusive Product**
   - **Test 3: Maximum Profit Split**
   - **Test 4: Night Scenario**

3. Click any test case button:
   - Products will be auto-selected
   - Explanation will appear showing what was selected and why
   - Selected products will be highlighted in blue

4. Click "Plan Order" to see the results

## Test Case Details

### Test 1: Single Store - All Available
- **Products:** Milk × 2, Bread × 1, Chicken × 1, Tomatoes × 1
- **Expected:** Day Store A has all products
- **Purpose:** Test single-store fulfillment vs profit optimization

### Test 2: Must Split - Exclusive Product
- **Products:** Milk × 1, Bread × 1, Cooking Oil × 1
- **Expected:** Cooking Oil only in Store E, forces split
- **Purpose:** Test forced multi-store scenario

### Test 3: Maximum Profit Split
- **Products:** Bread × 2, Eggs × 1, Rice × 1, Pasta × 1, Onions × 1
- **Expected:** Products cheapest in different stores
- **Purpose:** Test significant profit difference when splitting

### Test 4: Night Scenario
- **Products:** Milk × 1, Bread × 1, Eggs × 1
- **Expected:** Only 24/7 Store E available at night
- **Purpose:** Test limited store availability

## Features

✅ **Auto-Selection:** Click test case → products auto-selected
✅ **Visual Highlighting:** Test case products highlighted in blue
✅ **Explanations:** Shows what was selected and why
✅ **Test Badges:** Products from test case show "Test" badge
✅ **Active Test Indicator:** Shows which test case is active

## Notes

- Test cases use product names, so make sure product names match exactly
- If a product isn't found, check the console for warnings
- You can still manually adjust quantities after selecting a test case
- The explanation updates when you select a different test case




