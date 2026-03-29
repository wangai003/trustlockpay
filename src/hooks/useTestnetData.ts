// Testnet mock data + simulated state machine for interactive testing
import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface MockTransaction {
  id: string;
  tx_id: string;
  buyer_name: string;
  vendor_name: string;
  amount: number;
  fee: number;
  status: "locked" | "shipped" | "delivered" | "released" | "disputed";
  item: string;
  industry: string;
  tracking: string | null;
  order_number: number;
  created_at: string;
  buyer_location: string;
  vendor_location: string;
  type: "product" | "service";
}

export interface MockDispute {
  id: string;
  dispute_id: string;
  tx_id: string;
  vendor_name: string;
  amount: number;
  reason: string;
  status: "pending" | "under_review" | "resolved_buyer" | "resolved_vendor";
  created_at: string;
  ai_recommendation: string;
}

const INITIAL_TRANSACTIONS: MockTransaction[] = [
  {
    id: "demo-tx-1", tx_id: "TL-2026-0001", buyer_name: "Amara Osei",
    vendor_name: "Kente Craft Ltd", amount: 2500, fee: 62.5, status: "locked",
    item: "Premium Kente Cloth (5 yards)", industry: "textiles",
    tracking: null, order_number: 1, created_at: new Date().toISOString(),
    buyer_location: "Lagos, Nigeria", vendor_location: "Accra, Ghana", type: "product",
  },
  {
    id: "demo-tx-2", tx_id: "TL-2026-0002", buyer_name: "Jean-Pierre Mbeki",
    vendor_name: "Kente Craft Ltd", amount: 1800, fee: 45, status: "shipped",
    item: "Handwoven Basket Set", industry: "crafts",
    tracking: "GH-TRACK-99812", order_number: 2, created_at: new Date(Date.now() - 86400000).toISOString(),
    buyer_location: "Douala, Cameroon", vendor_location: "Accra, Ghana", type: "product",
  },
  {
    id: "demo-tx-3", tx_id: "TL-2026-0003", buyer_name: "Sarah Njeri",
    vendor_name: "Kente Craft Ltd", amount: 950, fee: 23.75, status: "delivered",
    item: "Logo Design Package", industry: "digital_services",
    tracking: null, order_number: 3, created_at: new Date(Date.now() - 172800000).toISOString(),
    buyer_location: "Nairobi, Kenya", vendor_location: "Accra, Ghana", type: "service",
  },
  {
    id: "demo-tx-4", tx_id: "TL-2026-0004", buyer_name: "Fatima Diallo",
    vendor_name: "Kente Craft Ltd", amount: 4200, fee: 105, status: "released",
    item: "Shea Butter (50kg)", industry: "agriculture",
    tracking: "NG-SHIP-44321", order_number: 4, created_at: new Date(Date.now() - 604800000).toISOString(),
    buyer_location: "Dakar, Senegal", vendor_location: "Accra, Ghana", type: "product",
  },
  {
    id: "demo-tx-5", tx_id: "TL-2026-0005", buyer_name: "Kwame Asante",
    vendor_name: "Kente Craft Ltd", amount: 3100, fee: 77.5, status: "disputed",
    item: "Cocoa Beans (100kg)", industry: "agriculture",
    tracking: "GH-TRACK-55123", order_number: 5, created_at: new Date(Date.now() - 1209600000).toISOString(),
    buyer_location: "Kumasi, Ghana", vendor_location: "Accra, Ghana", type: "product",
  },
];

const INITIAL_DISPUTES: MockDispute[] = [
  {
    id: "demo-dsp-1", dispute_id: "DSP-2026-0001", tx_id: "TL-2026-0005",
    vendor_name: "Kente Craft Ltd", amount: 3100, reason: "Quality issue",
    status: "under_review", created_at: new Date(Date.now() - 1209600000).toISOString(),
    ai_recommendation: "Emmanuel AI recommends partial refund (60%) — quality deviation documented by buyer photos.",
  },
];

const STORAGE_KEY = "tl_testnet_mock_state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(txs: MockTransaction[], disputes: MockDispute[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions: txs, disputes }));
}

export function useTestnetData() {
  const saved = loadState();
  const [transactions, setTransactions] = useState<MockTransaction[]>(saved?.transactions || INITIAL_TRANSACTIONS);
  const [disputes, setDisputes] = useState<MockDispute[]>(saved?.disputes || INITIAL_DISPUTES);

  const persist = useCallback((txs: MockTransaction[], dsps: MockDispute[]) => {
    setTransactions(txs);
    setDisputes(dsps);
    saveState(txs, dsps);
  }, []);

  const addTracking = useCallback((txId: string, tracking: string) => {
    const updated = transactions.map(tx =>
      tx.tx_id === txId ? { ...tx, tracking, status: "shipped" as const } : tx
    );
    persist(updated, disputes);
    toast.success(`📦 Tracking added: ${tracking} — Order marked as Shipped`);
  }, [transactions, disputes, persist]);

  const markDelivered = useCallback((txId: string) => {
    const updated = transactions.map(tx =>
      tx.tx_id === txId ? { ...tx, status: "delivered" as const } : tx
    );
    persist(updated, disputes);
    toast.success("🚚 Order marked as Delivered — awaiting buyer confirmation");
  }, [transactions, disputes, persist]);

  const confirmDelivery = useCallback((txId: string) => {
    const updated = transactions.map(tx =>
      tx.tx_id === txId ? { ...tx, status: "released" as const } : tx
    );
    persist(updated, disputes);
    toast.success("✅ Delivery confirmed — funds released to vendor!");
  }, [transactions, disputes, persist]);

  const openDispute = useCallback((txId: string, reason: string) => {
    const tx = transactions.find(t => t.tx_id === txId);
    const updatedTx = transactions.map(t =>
      t.tx_id === txId ? { ...t, status: "disputed" as const } : t
    );
    const newDispute: MockDispute = {
      id: `demo-dsp-${Date.now()}`,
      dispute_id: `DSP-${txId.replace("TL-", "")}`,
      tx_id: txId,
      vendor_name: tx?.vendor_name || "Unknown",
      amount: tx?.amount || 0,
      reason,
      status: "pending",
      created_at: new Date().toISOString(),
      ai_recommendation: "Emmanuel AI is analyzing evidence submitted...",
    };
    persist(updatedTx, [...disputes, newDispute]);
    toast.success("⚠️ Dispute filed — Emmanuel AI will begin review shortly");
  }, [transactions, disputes, persist]);

  const rejectOrders = useCallback((txIds: string[]) => {
    const updated = transactions.filter(tx => !txIds.includes(tx.tx_id));
    persist(updated, disputes);
    toast.success(`${txIds.length} order(s) rejected. Buyers notified.`);
  }, [transactions, disputes, persist]);

  const resetTestnetData = useCallback(() => {
    persist(INITIAL_TRANSACTIONS, INITIAL_DISPUTES);
    toast.success("🔄 Testnet data reset to defaults");
  }, [persist]);

  return {
    transactions,
    disputes,
    addTracking,
    markDelivered,
    confirmDelivery,
    openDispute,
    rejectOrders,
    resetTestnetData,
  };
}
