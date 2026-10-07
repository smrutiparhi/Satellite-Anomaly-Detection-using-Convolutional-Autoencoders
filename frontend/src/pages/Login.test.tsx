import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "./Login";

vi.mock("@react-oauth/google", () => ({ useGoogleLogin: () => vi.fn() }));
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

function renderLogin() {
  render(<MemoryRouter initialEntries={["/login"]}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<p>Workspace opened</p>} />
  </Routes></MemoryRouter>);
}

it("opens a local workspace with an explicitly local profile", async () => {
  renderLogin();
  await userEvent.click(screen.getByRole("button", { name: "Continue locally" }));
  await screen.findByText("Workspace opened");
  expect(JSON.parse(localStorage.getItem("user")!).email).toBe("local@example.test");
});

it("shows an actionable error when storage prevents local login", async () => {
  renderLogin();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  await userEvent.click(screen.getByRole("button", { name: "Continue locally" }));
  expect(await screen.findByText(/Browser storage is unavailable/)).toBeTruthy();
  expect(screen.queryByText("Workspace opened")).toBeNull();
});
