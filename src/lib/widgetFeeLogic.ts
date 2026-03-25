/**
 * Widget Installation Fee Logic
 *
 * Rules:
 * 1. First-time widget installation → $5 one-time fee, charged with the first plan payment.
 * 2. Disable/Enable toggle → No fee. Widget state is "disabled" but not "removed".
 * 3. Full deletion/removal by client → Widget marked as "deleted".
 * 4. Restoration after deletion → $5 fee charged on the next billing cycle (monthly or yearly).
 *
 * State machine:
 *   never_installed → installed (fee: $5)
 *   installed → disabled (fee: $0)
 *   disabled → installed (fee: $0)
 *   installed → deleted (fee: $0)
 *   disabled → deleted (fee: $0)
 *   deleted → installed (fee: $5, charged next cycle)
 */

export const WIDGET_INSTALL_FEE = 5.00;

export type WidgetState = "never_installed" | "installed" | "disabled" | "deleted";

export interface WidgetFeeState {
  widgetState: WidgetState;
  installFeePaid: boolean;
  pendingRestorationFee: boolean;
  totalInstallFeesCharged: number;
}

const STORAGE_KEY = "tl_widget_fee_state";

export function getWidgetFeeState(): WidgetFeeState {
  if (typeof window === "undefined") {
    return defaultState();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultState();
  try {
    return JSON.parse(stored) as WidgetFeeState;
  } catch {
    return defaultState();
  }
}

function defaultState(): WidgetFeeState {
  return {
    widgetState: "never_installed",
    installFeePaid: false,
    pendingRestorationFee: false,
    totalInstallFeesCharged: 0,
  };
}

export function saveWidgetFeeState(state: WidgetFeeState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Calculate fee when transitioning widget state.
 * Returns { fee, newState } where fee is the amount to charge (0 or 5).
 */
export function calculateWidgetTransitionFee(
  currentState: WidgetState,
  action: "install" | "enable" | "disable" | "delete" | "restore"
): { fee: number; newState: WidgetState; chargeMode: "immediate" | "next_cycle" | "none" } {
  switch (action) {
    case "install":
      if (currentState === "never_installed") {
        return { fee: WIDGET_INSTALL_FEE, newState: "installed", chargeMode: "immediate" };
      }
      return { fee: 0, newState: "installed", chargeMode: "none" };

    case "enable":
      // Re-enable from disabled state — no fee
      return { fee: 0, newState: "installed", chargeMode: "none" };

    case "disable":
      // Disable — no fee, widget stays in account
      return { fee: 0, newState: "disabled", chargeMode: "none" };

    case "delete":
      // Full removal — no fee at deletion time
      return { fee: 0, newState: "deleted", chargeMode: "none" };

    case "restore":
      // Restoration after deletion — $5 on next billing cycle
      if (currentState === "deleted") {
        return { fee: WIDGET_INSTALL_FEE, newState: "installed", chargeMode: "next_cycle" };
      }
      return { fee: 0, newState: "installed", chargeMode: "none" };

    default:
      return { fee: 0, newState: currentState, chargeMode: "none" };
  }
}

/**
 * Process a widget state transition and update persisted state.
 */
export function processWidgetTransition(
  action: "install" | "enable" | "disable" | "delete" | "restore"
): { fee: number; chargeMode: "immediate" | "next_cycle" | "none"; state: WidgetFeeState } {
  const current = getWidgetFeeState();
  const { fee, newState, chargeMode } = calculateWidgetTransitionFee(current.widgetState, action);

  const updated: WidgetFeeState = {
    widgetState: newState,
    installFeePaid: current.installFeePaid || (action === "install" && fee > 0),
    pendingRestorationFee: chargeMode === "next_cycle",
    totalInstallFeesCharged: current.totalInstallFeesCharged + (fee > 0 ? fee : 0),
  };

  saveWidgetFeeState(updated);
  return { fee, chargeMode, state: updated };
}
