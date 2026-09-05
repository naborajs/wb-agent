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
        const list = data.items || data.leads || [];
        if (list.length > 0) {
          setCustomers(
            list.map((l: any) => ({
              id: l.id,
              name: l.name || l.contact_name || "Valued Buyer",
              primary_phone: l.phone,
              company_name: l.company_name || l.company,
              city: l.city,
            }))
          );
        }
      }
    } catch (e) {
      console.error("Failed to load customer directory:", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find((cust) => cust.id === custId);
    if (c) {
      setShippingName(c.name);
      setShippingPhone(c.primary_phone);
      if (c.city) setShippingCity(c.city);
    }
  };

  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
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
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productName: string) => {
    const p = DEFAULT_PRODUCTS.find((prod) => prod.name === productName);
    if (p) {
      const updated = [...orderItems];
      updated[index].product_id = p.id;
      updated[index].product_name = p.name;
      updated[index].tea_grade = p.grade;
      updated[index].unit_price_per_kg = p.basePrice;
      setOrderItems(updated);
    }
  };

  const subtotalSum = orderItems.reduce(
    (sum, item) => sum + item.quantity_kg * item.unit_price_per_kg * (1 - item.discount_pct / 100),
    0
  );

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingName || !shippingPhone || orderItems.length === 0) {
      alert("Please fill in customer details and at least one order item.");
      return;
    }

    const payload = {
      customer_id: selectedCustomerId || undefined,
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_city: shippingCity || undefined,
      shipping_address: shippingAddress || undefined,
      payment_terms: paymentTerms,
      notes: orderNotes || undefined,
      items: orderItems.map((item) => ({
        product_id: item.product_id || "prod_assam_ctc",
        product_name: item.product_name,
        tea_grade: item.tea_grade,
        quantity_kg: Number(item.quantity_kg),
        unit_price_per_kg: Number(item.unit_price_per_kg),
        discount_pct: Number(item.discount_pct || 0),
        packaging_type: item.packaging_type,
      })),
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--ed-accent)]" />
            Wholesale Commercial Orders
          </h1>
          <p className="text-xs text-[var(--ed-text-muted)] mt-1">
            Direct estate wholesale orders placed via AI consultation or operator desk.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="ed-btn-primary ed-press ed-focus-ring flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Order
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ed-panel rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[var(--ed-text-muted)] uppercase tracking-wider">Total Orders</div>
          <div className="text-2xl font-bold font-data text-[var(--ed-text-primary)] mt-1">{orders.length}</div>
        </div>
        <div className="ed-panel rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[var(--ed-text-muted)] uppercase tracking-wider">Total Order Volume</div>
          <div className="text-2xl font-bold font-data text-[var(--ed-success)] mt-1">
            ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="ed-panel rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[var(--ed-text-muted)] uppercase tracking-wider">Confirmed / Pending</div>
          <div className="text-2xl font-bold font-data text-[var(--ed-warning)] mt-1">
            {orders.filter((o) => o.status === "confirmed").length}
          </div>
        </div>
        <div className="ed-panel rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[var(--ed-text-muted)] uppercase tracking-wider">Dispatched / Delivered</div>
          <div className="text-2xl font-bold font-data text-[var(--ed-accent)] mt-1">
            {orders.filter((o) => o.status === "dispatched" || o.status === "completed").length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[var(--ed-text-muted)] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search order #, customer name, or destination city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-xl text-xs text-[var(--ed-text-primary)] placeholder-[var(--ed-text-muted)] ed-focus-ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-xl text-xs font-semibold text-[var(--ed-text-primary)] ed-focus-ring"
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
      <div className="ed-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-[var(--ed-border)] text-xs font-semibold text-[var(--ed-text-muted)] uppercase tracking-wider" style={{ background: "var(--ed-bg)" }}>
              <th className="py-3.5 px-4">Order #</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Destination</th>
              <th className="py-3.5 px-4">Items & Grades</th>
              <th className="py-3.5 px-4">Total Value</th>
              <th className="py-3.5 px-4">Payment</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ed-border)] text-xs">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[var(--ed-text-muted)] text-xs">
                  {loading ? "Loading wholesale orders..." : "No commercial orders found."}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[var(--ed-bg)] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[var(--ed-text-primary)]">
                    {order.order_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[var(--ed-text-primary)]">{order.customer_name}</div>
                    {order.customer_company && (
                      <div className="text-[11px] text-[var(--ed-text-muted)] flex items-center gap-1">
                        <Building className="w-3 h-3" /> {order.customer_company}
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-data flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" /> {order.customer_phone}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[var(--ed-text-primary)] flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-[var(--ed-accent)]" /> {order.shipping_city || "Siliguri Hub"}
                    </div>
                    {order.shipping_address && (
                      <div className="text-[10px] text-[var(--ed-text-muted)] truncate max-w-xs">{order.shipping_address}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[var(--ed-text-primary)]">
                      {order.items && order.items.length > 0
                        ? order.items.map((i) => `${i.product_name} (${i.quantity_kg}kg)`).join(", ")
                        : `${order.items_count || 1} line item(s)`}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-data font-bold text-[var(--ed-text-primary)]">
                    ₹{order.total_amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] text-[var(--ed-text-muted)] block">{order.payment_terms}</span>
                    <span className="text-[10px] font-semibold text-[var(--ed-warning)]">
                      {order.payment_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === "completed" || order.status === "dispatched"
                          ? "text-[var(--ed-success)] border border-[var(--ed-success)]/20"
                          : order.status === "cancelled"
                          ? "text-[var(--ed-danger)] border border-[var(--ed-danger)]/20"
                          : "text-[var(--ed-accent)] border border-[var(--ed-accent)]/20"
                      }`}
                      style={{
                        background:
                          order.status === "completed" || order.status === "dispatched"
                            ? "color-mix(in srgb, var(--ed-success) 10%, transparent)"
                            : order.status === "cancelled"
                            ? "color-mix(in srgb, var(--ed-danger) 10%, transparent)"
                            : "color-mix(in srgb, var(--ed-accent) 10%, transparent)",
                      }}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                      className="text-[11px] font-semibold bg-[var(--ed-bg)] border border-[var(--ed-border)] rounded-lg px-2 py-1 text-[var(--ed-text-primary)] focus:outline-none"
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

      {/* CREATE ORDER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-[var(--ed-border)] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[var(--ed-accent)]" />
                Create New Commercial Order
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="ed-press p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              {/* Customer Select */}
              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Select Registered Customer (Optional)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                >
                  <option value="">-- Choose existing buyer or enter details below --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ""} - {c.primary_phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Buyer / Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    WhatsApp Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data ed-focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Destination City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Siliguri, Kolkata, Delhi"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                  >
                    <option value="100% Advance on Pro-Forma">100% Advance on Pro-Forma</option>
                    <option value="Standard Wholesale (100% on Dispatch)">Standard Wholesale (100% on Dispatch)</option>
                    <option value="50% Advance / 50% on Delivery">50% Advance / 50% on Delivery</option>
                    <option value="15-Day Commercial Credit">15-Day Commercial Credit (Approved)</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2 border-t border-[var(--ed-border)]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--ed-text-primary)]">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="ed-press text-[var(--ed-accent)] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Tea
                  </button>
                </div>

                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border border-[var(--ed-border)] rounded-xl grid grid-cols-2 sm:grid-cols-12 gap-2 items-center"
                      style={{ background: "var(--ed-bg)" }}
                    >
                      <div className="col-span-2 sm:col-span-4">
                        <span className="text-[10px] font-semibold text-[var(--ed-text-muted)] block mb-1">Tea Blend</span>
                        <select
                          value={item.product_name}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="w-full px-2 py-1.5 bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-lg text-xs text-[var(--ed-text-primary)] font-medium focus:outline-none"
                        >
                          {DEFAULT_PRODUCTS.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.grade})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-semibold text-[var(--ed-text-muted)] block mb-1">Qty (kg)</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity_kg}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[index].quantity_kg = parseFloat(e.target.value) || 0;
                            setOrderItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-lg text-xs text-[var(--ed-text-primary)] font-data font-bold focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-semibold text-[var(--ed-text-muted)] block mb-1">Rate (₹/kg)</span>
                        <input
                          type="number"
                          value={item.unit_price_per_kg}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[index].unit_price_per_kg = parseFloat(e.target.value) || 0;
                            setOrderItems(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-lg text-xs text-[var(--ed-text-primary)] font-data focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-semibold text-[var(--ed-text-muted)] block mb-1">Disc %</span>
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
                          className="w-full px-2 py-1.5 bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-lg text-xs text-[var(--ed-text-primary)] font-data focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2 flex items-center justify-between pt-1 sm:pt-3">
                        <span className="text-xs font-bold font-data text-[var(--ed-text-primary)] block">
                          ₹{(item.quantity_kg * item.unit_price_per_kg * (1 - item.discount_pct / 100)).toLocaleString("en-IN")}
                        </span>
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-danger)]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 border border-[var(--ed-border)] rounded-xl flex items-center justify-between" style={{ background: "var(--ed-bg)" }}>
                <div>
                  <div className="text-xs font-bold text-[var(--ed-text-primary)] uppercase tracking-wider">
                    Calculated Wholesale Total
                  </div>
                  <div className="text-xs text-[var(--ed-text-muted)] mt-0.5">
                    Includes garden volume discounts & food-grade packaging
                  </div>
                </div>
                <div className="text-2xl font-black font-data text-[var(--ed-accent)]">
                  ₹{subtotalSum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ed-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="ed-press px-4 py-2.5 rounded-lg border border-[var(--ed-border)] text-xs font-semibold text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ed-btn-primary ed-press ed-focus-ring px-6 py-2.5 text-xs font-semibold rounded-xl"
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
