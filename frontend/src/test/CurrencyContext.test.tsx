import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyProvider, useCurrency } from "../contexts/CurrencyContext";
import { CurrencySelector } from "../components/shop/CurrencySelector";

function View() {
  const { format } = useCurrency();
  return <><CurrencySelector /><output data-testid="price">{format(1000)}</output></>;
}
const liveRates = { source: "exchangerate-api.com", base: "INR", rates: { INR: 1, EUR: 0.01, USD: 0.012, GBP: 0.009 } };
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("currency selection", () => {
  it("switches displayed prices and retains manual preference after remount", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url === "/api/rates" ? liveRates : { country: "IN", currency: "INR" } })));
    const mounted = render(<CurrencyProvider><View /></CurrencyProvider>);
    await waitFor(() => expect(screen.getByTestId("price")).toHaveTextContent("1,000"));
    fireEvent.change(screen.getByLabelText("Select currency"), { target: { value: "EUR" } });
    await waitFor(() => expect(screen.getByTestId("price")).toHaveTextContent("10.00"));
    fireEvent.change(screen.getByLabelText("Select currency"), { target: { value: "USD" } });
    expect(screen.getByTestId("price")).toHaveTextContent("12.00");
    expect(localStorage.getItem("he_currency_v1")).toBe("USD");
    mounted.unmount();
    render(<CurrencyProvider><View /></CurrencyProvider>);
    await waitFor(() => expect(screen.getByTestId("price")).toHaveTextContent("12.00"));
    expect(screen.getByLabelText("Select currency")).toHaveValue("USD");
  });

  it("does not let a late geolocation response override a manual choice", async () => {
    let resolveGeo!: (value: unknown) => void;
    const geo = new Promise((resolve) => { resolveGeo = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/rates" ? { ok: true, json: async () => liveRates } : geo));
    render(<CurrencyProvider><View /></CurrencyProvider>);
    fireEvent.change(screen.getByLabelText("Select currency"), { target: { value: "EUR" } });
    await act(async () => { resolveGeo({ ok: true, json: async () => ({ country: "IN", currency: "INR" }) }); });
    expect(screen.getByLabelText("Select currency")).toHaveValue("EUR");
    expect(screen.getByTestId("price")).toHaveTextContent("10.00");
  });

  it("automatically selects the detected currency when there is no manual preference", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url === "/api/rates" ? liveRates : { country: "BE", currency: "EUR" } })));
    render(<CurrencyProvider><View /></CurrencyProvider>);
    await waitFor(() => expect(screen.getByTestId("price")).toHaveTextContent("10.00"));
    expect(screen.getByLabelText("Select currency")).toHaveValue("EUR");
  });
});
