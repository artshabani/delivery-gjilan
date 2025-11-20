"use client";

import { useState, useEffect } from "react";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";
import { supabase } from "@/lib/supabase";
import type { OrderPlan, OrderPlanWithOptions } from "@/types/store";

interface TestCase {
  id: number;
  name: string;
  description: string;
  products: { name: string; quantity: number }[];
  explanation: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 1,
    name: "Test 1: Single Store vs Split",
    description: "Store A has all products, but Bread is cheaper in Store B",
    products: [
      { name: "Milk 1L", quantity: 2 },
      { name: "Bread White", quantity: 1 },
      { name: "Chicken 1kg", quantity: 1 },
      { name: "Tomatoes 1kg", quantity: 1 },
    ],
    explanation: "Day Store A has all 4 products (convenient). But Bread is cheaper in Store B (€1.15 vs €1.20). Option 2 will split to get cheaper Bread from Store B.",
  },
  {
    id: 2,
    name: "Test 2: Must Split - Exclusive Product",
    description: "One product only available in 24/7 Store E",
    products: [
      { name: "Milk 1L", quantity: 1 },
      { name: "Bread White", quantity: 1 },
      { name: "Cooking Oil 1L", quantity: 1 },
    ],
    explanation: "Cooking Oil is only in Store E. Store E has Milk and Bread too, so Option 1 uses Store E. But Option 2 will split: Store A for Milk (€1.80) + Store B for Bread (€1.15) + Store E for Oil (€3.20) = saves €0.45!",
  },
  {
    id: 3,
    name: "Test 3: Maximum Profit Split",
    description: "Products have different cheapest stores",
    products: [
      { name: "Bread White", quantity: 2 },
      { name: "Eggs 12pcs", quantity: 1 },
      { name: "Rice 1kg", quantity: 1 },
      { name: "Pasta 500g", quantity: 1 },
      { name: "Onions 1kg", quantity: 1 },
    ],
    explanation: "Products are cheapest in different stores: Bread/Rice/Onions cheapest in Store B, Eggs/Pasta cheapest in Store C. Store E has all products but is more expensive. Option 2 will split between Store B and Store C for maximum profit.",
  },
  {
    id: 4,
    name: "Test 4: Night Scenario",
    description: "Testing with limited stores (night hours)",
    products: [
      { name: "Milk 1L", quantity: 1 },
      { name: "Bread White", quantity: 1 },
      { name: "Eggs 12pcs", quantity: 1 },
    ],
    explanation: "During night hours, only Night Store D and 24/7 Store E are open. System should handle limited availability.",
  },
];

export default function StorePlanningTestPage() {
  const guard = useAdminGuard();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});
  const [plan, setPlan] = useState<OrderPlan | null>(null);
  const [planOptions, setPlanOptions] = useState<OrderPlanWithOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTestCase, setActiveTestCase] = useState<TestCase | null>(null);
  const [testExplanation, setTestExplanation] = useState<string>("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  };

  const loadTestCase = (testCase: TestCase) => {
    setActiveTestCase(testCase);
    setTestExplanation(testCase.explanation);
    setPlan(null);
    setError(null);

    // Clear current selections
    const newSelections: Record<number, number> = {};

    // Find and select products from test case
    // Use current products state
    testCase.products.forEach((testProduct) => {
      const product = products.find(
        (p) => p.name.toLowerCase() === testProduct.name.toLowerCase()
      );
      if (product) {
        newSelections[product.id] = testProduct.quantity;
      } else {
        console.warn(`Product not found: ${testProduct.name}`);
      }
    });

    setSelectedProducts(newSelections);
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      const newSelected = { ...selectedProducts };
      delete newSelected[productId];
      setSelectedProducts(newSelected);
    } else {
      setSelectedProducts({ ...selectedProducts, [productId]: quantity });
    }
  };

  const testOrderPlan = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setPlanOptions(null);

    try {
      const cartItems = Object.entries(selectedProducts).map(([productId, quantity]) => ({
        product_id: Number(productId),
        quantity: Number(quantity),
      }));

      const customerPrices: Record<number, number> = {};
      products.forEach((p) => {
        if (selectedProducts[p.id]) {
          customerPrices[p.id] = Number(p.price);
        }
      });

      const res = await fetch("/api/orders/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems, customerPrices, includeOptions: true }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to plan order");
      }

      const data = await res.json();
      if (data.options) {
        setPlanOptions(data.options);
        // Set first option as default plan for display
        if (data.options.options.length > 0) {
          setPlan(data.options.options[0].plan);
        }
      } else {
        setPlan(data.plan);
      }
    } catch (err: any) {
      setError(err.message || "Failed to plan order");
    } finally {
      setLoading(false);
    }
  };

  if (guard.loading) {
    return <p className="p-6 text-gray-200">Checking permission…</p>;
  }
  if (!guard.allowed) {
    return <p className="p-6 text-red-400 text-xl font-semibold">Access Denied</p>;
  }

  const selectedCount = Object.keys(selectedProducts).length;

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-900 text-gray-200">
      <h1 className="text-3xl font-bold mb-6">Store Planning Test Dashboard</h1>

      {/* Test Case Buttons */}
      <div className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Quick Test Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {TEST_CASES.map((testCase) => (
            <button
              key={testCase.id}
              onClick={() => loadTestCase(testCase)}
              className={`p-3 rounded-lg border text-left transition ${
                activeTestCase?.id === testCase.id
                  ? "bg-blue-600 border-blue-400"
                  : "bg-gray-700 border-gray-600 hover:bg-gray-600"
              }`}
            >
              <div className="font-semibold text-sm mb-1">{testCase.name}</div>
              <div className="text-xs text-gray-300">{testCase.description}</div>
            </button>
          ))}
        </div>
        {testExplanation && (
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded text-sm">
            <span className="font-semibold text-blue-300">Test Explanation:</span>{" "}
            <span className="text-gray-200">{testExplanation}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Product Selection */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Select Products & Quantities</h2>
            {activeTestCase && (
              <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                Test {activeTestCase.id} Active
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No products found. Add products first.</p>
            ) : (
              products.map((product) => {
                const isSelected = selectedProducts[product.id] > 0;
                const isFromTestCase = activeTestCase?.products.some(
                  (tp) => tp.name.toLowerCase() === product.name.toLowerCase()
                );
                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-3 rounded border ${
                      isSelected
                        ? isFromTestCase
                          ? "bg-blue-900/30 border-blue-500"
                          : "bg-green-900/30 border-green-500"
                        : "bg-gray-700 border-gray-600"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{product.name}</p>
                        {isFromTestCase && (
                          <span className="text-xs bg-blue-600 px-1.5 py-0.5 rounded">
                            Test
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">€{Number(product.price).toFixed(2)}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      className="w-20 p-2 bg-gray-600 border border-gray-500 rounded text-center"
                      value={selectedProducts[product.id] || 0}
                      onChange={(e) =>
                        handleQuantityChange(product.id, Number(e.target.value))
                      }
                    />
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={testOrderPlan}
            disabled={selectedCount === 0 || loading}
            className="mt-4 w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Planning..." : `Plan Order (${selectedCount} items)`}
          </button>
        </div>

        {/* RIGHT: Results */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Order Plan Results</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}

          {planOptions && planOptions.options.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Test Case Info */}
              {activeTestCase && (
                <div className="p-4 bg-blue-900/30 rounded border border-blue-700">
                  <h3 className="font-semibold text-blue-300 mb-2">
                    Test Case {activeTestCase.id}: {activeTestCase.name}
                  </h3>
                  <div className="text-sm text-gray-200 mb-2">
                    <strong>Selected Items:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {activeTestCase.products.map((p, idx) => (
                        <li key={idx}>
                          {p.name} × {p.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-sm text-gray-300 italic">
                    {activeTestCase.explanation}
                  </div>
                </div>
              )}

              {/* Options Comparison */}
              {planOptions.options.length === 1 ? (
                <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded mb-4">
                  <p className="text-sm text-yellow-200">
                    <strong>Note:</strong> Only one option available. The recommended store is also the maximum profit option (no alternative stores available).
                  </p>
                </div>
              ) : null}
              <div className={`grid gap-4 ${planOptions.options.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                {planOptions.options.map((option, idx) => (
                  <div
                    key={option.id}
                    className={`p-4 rounded border ${
                      option.is_recommended
                        ? "bg-green-900/30 border-green-500"
                        : "bg-gray-700 border-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">
                        Option {idx + 1}
                        {option.is_recommended && (
                          <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">
                            ⭐ RECOMMENDED
                          </span>
                        )}
                      </h3>
                      {option.profit_difference !== undefined && option.profit_difference > 0 && (
                        <span className="text-sm font-semibold text-green-400">
                          +€{option.profit_difference.toFixed(2)} more profit
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-300 mb-3">{option.recommendation}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Stores:</span>
                        <span className="font-semibold">{option.store_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wholesale Cost:</span>
                        <span className="font-semibold">€{option.plan.total_wholesale_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Customer Price:</span>
                        <span className="font-semibold">€{option.plan.total_customer_price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-600 pt-2">
                        <span className="text-gray-400">Profit:</span>
                        <span className={`font-semibold text-lg ${
                          option.plan.total_margin >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          €{option.plan.total_margin.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h4 className="font-semibold text-sm mb-2">Store Routes:</h4>
                      <div className="space-y-2">
                        {option.plan.store_route_plan.map((route, routeIdx) => (
                          <div key={routeIdx} className="bg-gray-800 p-2 rounded text-xs">
                            <div className="font-semibold text-blue-400 mb-1">
                              {route.store_name}
                            </div>
                            <div className="text-gray-300 space-y-1">
                              {route.items.map((item, itemIdx) => {
                                const product = products.find((p) => p.id === item.product_id);
                                return (
                                  <div key={itemIdx} className="flex justify-between">
                                    <span>
                                      {product?.name || `Product ${item.product_id}`} × {item.quantity}
                                    </span>
                                    <span>€{item.wholesale_price.toFixed(2)} each</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-1 text-gray-400">
                              Cost: €{route.total_wholesale_cost.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : plan && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Test Case Info */}
              {activeTestCase && (
                <div className="p-4 bg-blue-900/30 rounded border border-blue-700">
                  <h3 className="font-semibold text-blue-300 mb-2">
                    Test Case {activeTestCase.id}: {activeTestCase.name}
                  </h3>
                  <div className="text-sm text-gray-200 mb-2">
                    <strong>Selected Items:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {activeTestCase.products.map((p, idx) => (
                        <li key={idx}>
                          {p.name} × {p.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-sm text-gray-300 italic">
                    {activeTestCase.explanation}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-gray-700 rounded border border-gray-600">
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-400">Stores Needed:</span>{" "}
                    <span className="font-semibold">{plan.store_route_plan.length}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Total Wholesale Cost:</span>{" "}
                    <span className="font-semibold">€{plan.total_wholesale_cost.toFixed(2)}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Total Customer Price:</span>{" "}
                    <span className="font-semibold">€{plan.total_customer_price.toFixed(2)}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Total Margin:</span>{" "}
                    <span className={`font-semibold ${plan.total_margin >= 0 ? "text-green-400" : "text-red-400"}`}>
                      €{plan.total_margin.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Cheapest Store Per Item */}
              <div className="p-4 bg-gray-700 rounded border border-gray-600">
                <h3 className="font-semibold mb-2">Cheapest Store Per Item</h3>
                <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                  {Object.entries(plan.cheapest_store_per_item).map(([productId, storeInfo]) => {
                    const product = products.find((p) => p.id === Number(productId));
                    return (
                      <div key={productId} className="flex justify-between">
                        <span className="text-gray-400">{product?.name || `Product ${productId}`}:</span>
                        <span>
                          {storeInfo.store_name} (€{storeInfo.wholesale_price.toFixed(2)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Store Routes */}
              <div className="space-y-3">
                <h3 className="font-semibold">Store Routes</h3>
                {plan.store_route_plan.map((route, idx) => (
                  <div key={idx} className="p-4 bg-gray-700 rounded border border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-blue-400">
                        Store: {route.store_name} (ID: {route.store_id})
                      </h4>
                      <span className="text-sm text-gray-400">
                        Cost: €{route.total_wholesale_cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {route.items.map((item, itemIdx) => {
                        const product = products.find((p) => p.id === item.product_id);
                        return (
                          <div key={itemIdx} className="flex justify-between text-gray-300">
                            <span>
                              {product?.name || `Product ${item.product_id}`} × {item.quantity}
                            </span>
                            <span>€{item.wholesale_price.toFixed(2)} each</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!plan && !error && (
            <p className="text-gray-400 text-center py-8">
              Select products and click "Plan Order" to see results
            </p>
          )}
        </div>
      </div>
    </div>
  );
}





