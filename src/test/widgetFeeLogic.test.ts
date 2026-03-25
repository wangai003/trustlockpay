import { describe, it, expect } from "vitest";
import {
  calculateWidgetTransitionFee,
  processWidgetTransition,
  getWidgetFeeState,
  saveWidgetFeeState,
  WIDGET_INSTALL_FEE,
  type WidgetState,
  type WidgetFeeState,
} from "@/lib/widgetFeeLogic";

describe("Widget Fee Logic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("calculateWidgetTransitionFee", () => {
    it("charges $5 on first install from never_installed", () => {
      const result = calculateWidgetTransitionFee("never_installed", "install");
      expect(result.fee).toBe(WIDGET_INSTALL_FEE);
      expect(result.newState).toBe("installed");
      expect(result.chargeMode).toBe("immediate");
    });

    it("charges $0 on disable", () => {
      const result = calculateWidgetTransitionFee("installed", "disable");
      expect(result.fee).toBe(0);
      expect(result.newState).toBe("disabled");
      expect(result.chargeMode).toBe("none");
    });

    it("charges $0 on re-enable from disabled", () => {
      const result = calculateWidgetTransitionFee("disabled", "enable");
      expect(result.fee).toBe(0);
      expect(result.newState).toBe("installed");
      expect(result.chargeMode).toBe("none");
    });

    it("charges $0 on delete", () => {
      const result = calculateWidgetTransitionFee("installed", "delete");
      expect(result.fee).toBe(0);
      expect(result.newState).toBe("deleted");
      expect(result.chargeMode).toBe("none");
    });

    it("charges $5 on restore after deletion, next_cycle", () => {
      const result = calculateWidgetTransitionFee("deleted", "restore");
      expect(result.fee).toBe(WIDGET_INSTALL_FEE);
      expect(result.newState).toBe("installed");
      expect(result.chargeMode).toBe("next_cycle");
    });

    it("charges $0 on restore when not deleted", () => {
      const result = calculateWidgetTransitionFee("installed", "restore");
      expect(result.fee).toBe(0);
      expect(result.chargeMode).toBe("none");
    });
  });

  describe("processWidgetTransition (state persistence)", () => {
    it("persists state after install", () => {
      const { state } = processWidgetTransition("install");
      expect(state.widgetState).toBe("installed");
      expect(state.installFeePaid).toBe(true);
      expect(state.totalInstallFeesCharged).toBe(5);

      const loaded = getWidgetFeeState();
      expect(loaded.widgetState).toBe("installed");
    });

    it("full lifecycle: install → disable → enable → delete → restore", () => {
      let result = processWidgetTransition("install");
      expect(result.fee).toBe(5);
      expect(result.state.widgetState).toBe("installed");

      result = processWidgetTransition("disable");
      expect(result.fee).toBe(0);
      expect(result.state.widgetState).toBe("disabled");

      result = processWidgetTransition("enable");
      expect(result.fee).toBe(0);
      expect(result.state.widgetState).toBe("installed");

      result = processWidgetTransition("delete");
      expect(result.fee).toBe(0);
      expect(result.state.widgetState).toBe("deleted");

      result = processWidgetTransition("restore");
      expect(result.fee).toBe(5);
      expect(result.chargeMode).toBe("next_cycle");
      expect(result.state.widgetState).toBe("installed");
      expect(result.state.totalInstallFeesCharged).toBe(10);
      expect(result.state.pendingRestorationFee).toBe(true);
    });
  });

  describe("getWidgetFeeState defaults", () => {
    it("returns default state when nothing stored", () => {
      const state = getWidgetFeeState();
      expect(state.widgetState).toBe("never_installed");
      expect(state.installFeePaid).toBe(false);
      expect(state.pendingRestorationFee).toBe(false);
      expect(state.totalInstallFeesCharged).toBe(0);
    });

    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem("tl_widget_fee_state", "NOT JSON");
      const state = getWidgetFeeState();
      expect(state.widgetState).toBe("never_installed");
    });
  });
});
