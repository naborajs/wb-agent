"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  IndianRupee,
  Building,
  Phone,
  MapPin,
  X,
} from "lucide-react";

interface OrderItem {
  product_name: string;
  tea_grade: string;
  quantity_kg: number;
  unit_price_per_kg: number;
  subtotal: number;
  packaging_type: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_company: string | null;
  customer_phone: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  currency: string;
  shipping_city: string | null;
  shipping_address: string | null;
  payment_status: string;
  payment_terms: string;
  created_at: string;
  items_count: number;
  items: OrderItem[];
}

interface CustomerOption {
  id: string;
  name: string;
  primary_phone: string;
  company_name: string | null;
  city: string | null;
}

const DEFAULT_PRODUCTS = [
  { id: "prod_assam_ctc", name: "Assam Kadak CTC", grade: "BP", basePrice: 340 },
  { id: "prod_dooars_blend", name: "Dooars Hotel Blend", grade: "BOP", basePrice: 230 },
  { id: "prod_darjeeling_ff", name: "Darjeeling First Flush", grade: "FTGFOP1", basePrice: 1450 },
  { id: "prod_green_tea", name: "Siliguri Green Tea Leaf", grade: "Whole Leaf", basePrice: 480 },
  { id: "prod_white_peony", name: "Premium White Peony", grade: "Silver Needle", basePrice: 2800 },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Standard Wholesale (100% on Dispatch)");
  const [orderNotes, setOrderNotes] = useState("");
  
  // Line items state
  const [orderItems, setOrderItems] = useState([
    {
      product_id: "prod_assam_ctc",
      product_name: "Assam Kadak CTC",
      tea_grade: "BP",
      packaging_type: "Jute Bag (20kg)",
      quantity_kg: 50,
      unit_price_per_kg: 323,
      discount_pct: 5,
    },
  ]);

  // Load orders and customers
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/v1/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Failed to load orders:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/v1/leads");
      if (res.ok) {
        const data = await res.json();
        if (data && data.items) {
          setCustomers(
            data.items.map((item: any) => ({
              id: item.id,
              name: item.name || "Customer",
              primary_phone: item.phone,
              company_name: item.company_name,
              city: item.city,
            }))
          );
        }
      }
    } catch (e) {
      console.error("Failed to load customers:", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  // Calculate live modal totals
  const subtotalSum = orderItems.reduce((acc, item) => {
    const raw = item.quantity_kg * item.unit_price_per_kg;
    const disc = raw * (item.discount_pct / 100);
    return acc + (raw - disc);
  }, 0);

  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: "prod_dooars_blend",
        product_name: "Dooars Hotel Blend",
        tea_grade: "BOP",
        packaging_type: "Jute Bag (20kg)",
        quantity_kg: 20,
        unit_price_per_kg: 230,
        discount_pct: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, prodName: string) => {
    const found = DEFAULT_PRODUCTS.find((p) => p.name === prodName);
    if (!found) return;
    const updated = [...orderItems];
    updated[index].product_id = found.id;
    updated[index].product_name = found.name;
    updated[index].tea_grade = found.grade;
    updated[index].unit_price_per_kg = found.basePrice;
    setOrderItems(updated);
  };

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setShippingName(found.name);
      setShippingPhone(found.primary_phone);
      setShippingCity(found.city || "Siliguri");
    }
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer.");
      return;
    }

    const payload = {
      customer_id: selectedCustomerId,
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_city: shippingCity,
      shipping_address: shippingAddress || shippingCity,
      payment_terms: paymentTerms,
      notes: orderNotes,
      items: orderItems,
    };

    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail || "Failed to create order"}`);
      }
    } catch (e) {
      alert("Network error creating order.");
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.shipping_city && o.shipping_city.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header Bar */}
      <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-700" />
            Wholesale Commercial Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Direct estate wholesale orders placed via AI consultation or operator desk.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-lg shadow-sm shadow-amber-700/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Order
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 p-6 pb-2">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Orders</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Order Volume</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmed / Pending</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {orders.filter((o) => o.status === "confirmed").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dispatched / Delivered</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {orders.filter((o) => o.status === "dispatched" || o.status === "completed").length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order #, customer name, or destination city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="invoiced">Invoiced</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Items & Grades</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                    {loading ? "Loading wholesale orders..." : "No commercial orders found."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-xs">
                      {order.order_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">{order.customer_name || "Buyer"}</div>
                      <div className="text-xs text-slate-500">{order.customer_company || order.customer_phone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {order.shipping_city || "Siliguri"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800">
                        {order.items.map((it) => `${it.quantity_kg}kg ${it.product_name} (${it.tea_grade})`).join(", ")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      ₹{order.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {order.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          order.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : order.status === "dispatched"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : order.status === "invoiced"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:border-amber-700"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="invoiced">Invoiced</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Order Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Create Wholesale Tea Order</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate official commercial order with volume pricing and automatic owner WhatsApp alert.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="p-6 overflow-y-auto space-y-6">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Buyer / Lead *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                >
                  <option value="">-- Choose Customer / Cafe / Hotel --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company_name || "Business"}) — {c.primary_phone} [{c.city || "Siliguri"}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Destination City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siliguri, Kolkata, Delhi"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                  >
                    <option value="Standard Wholesale (100% on Dispatch)">100% on Dispatch</option>
                    <option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</option>
                    <option value="Net 15 Days (Authorized B2B)">Net 15 Days</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Order Items (Teas & Quantities) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Tea
                  </button>
                </div>

                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-4">
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">Tea Blend</span>
                        <select
                          value={item.product_name}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                        >
                          {DEFAULT_PRODUCTS.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.grade})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">Quantity (kg)</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity_kg}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[index].quantity_kg = parseFloat(e.target.value) || 0;
                            setOrderItems(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">Rate (₹/kg)</span>
                        <input
                          type="number"
                          value={item.unit_price_per_kg}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[index].unit_price_per_kg = parseFloat(e.target.value) || 0;
                            setOrderItems(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <span className="text-[11px] font-medium text-slate-500 block mb-1">Discount %</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={item.discount_pct}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[index].discount_pct = parseFloat(e.target.value) || 0;
                            setOrderItems(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between pt-4">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900 block">
                            ₹{(item.quantity_kg * item.unit_price_per_kg * (1 - item.discount_pct / 100)).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-slate-400 hover:text-red-600 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                    Calculated Wholesale Total
                  </div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    Includes garden volume discounts & food-grade packaging
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-900">
                  ₹{subtotalSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-lg shadow-sm shadow-amber-700/20"
                >
                  Confirm & Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
