import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { readUser } from "../utils/session";

const model = { architecture: "compact", threshold: .000483, parameters: 78235, image_size: 128,
  best_epoch: 20, normal_class: "Forest", anomaly_class: "Industrial", history: [] };
const prediction = { score: .054, label: "Anomaly", isAnomaly: true, threshold: .000483,
  images: { original: "data:image/png;base64,eA==", reconstructed: "data:image/png;base64,eQ==", heatmap: "data:image/png;base64,eg==" },
  input: { width: 64, height: 64, model_size: 128 } };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("user", JSON.stringify({ name: "Test", email: "test@example.test" }));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL() { return "blob:preview"; }
    static revokeObjectURL() {}
  });
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 64, height: 64, close: vi.fn() }));
  fetchMock = vi.fn(async (url: string) => url.includes("/analyze") ? json(prediction) : json(model));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function openDashboard() {
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText("Model connected");
}
async function upload() {
  await userEvent.upload(screen.getByLabelText("Satellite image file"), new File(["image"], "scene.jpg", { type: "image/jpeg" }));
  await screen.findByText("scene.jpg");
}

describe("working analysis workspace", () => {
  it("uploads to the API, switches image views, and saves a real result to history", async () => {
    await openDashboard();
    await upload();
    await userEvent.click(screen.getByRole("button", { name: "Analyze image" }));
    await screen.findByText("Unfamiliar compared with Forest training imagery");
    const call = fetchMock.mock.calls.find(([url]) => url === "/api/analyze");
    expect(call?.[1].body.get("file").name).toBe("scene.jpg");
    await userEvent.click(screen.getByRole("button", { name: "reconstructed" }));
    expect(screen.getByAltText("reconstructed satellite image").getAttribute("src")).toBe(prediction.images.reconstructed);
    await userEvent.click(screen.getByRole("button", { name: "original" }));
    expect(screen.getByAltText("original satellite image").getAttribute("src")).toBe(prediction.images.original);
    await userEvent.click(screen.getByRole("button", { name: "Scan History" }));
    expect(screen.getByText("scene.jpg")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("satellite-scans-v1")!)[0].score).toBe(.054);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Clear scan history" }));
    expect(localStorage.getItem("satellite-scans-v1")).toBeNull();
  });

  it("recovers from a failed model connection and validates a threshold before upload", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Retry connection" }));
    await screen.findByText("Model connected");
    await upload();
    await userEvent.click(screen.getByRole("checkbox"));
    const threshold = screen.getByRole("spinbutton");
    await userEvent.clear(threshold);
    await userEvent.type(threshold, "0");
    await userEvent.click(screen.getByRole("button", { name: "Analyze image" }));
    expect(screen.getByRole("alert").textContent).toContain("Threshold must be greater than zero");
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/analyze"))).toBe(false);
    await userEvent.clear(threshold);
    await userEvent.type(threshold, "0.2");
    await userEvent.click(screen.getByRole("button", { name: "Analyze image" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === "/api/analyze?threshold=0.2")).toBe(true));
  });

  it("reports corrupt uploads and allows another image after an analysis failure", async () => {
    await openDashboard();
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("decode failure"));
    await userEvent.upload(screen.getByLabelText("Satellite image file"), new File(["bad"], "broken.png", { type: "image/png" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be decoded");
    await upload();
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ detail: "Calibrated model unavailable" }), { status: 503 }));
    await userEvent.click(screen.getByRole("button", { name: "Analyze image" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Calibrated model unavailable");
    expect(JSON.parse(localStorage.getItem("satellite-scans-v1") || "[]")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Remove image" }));
    expect(screen.getByLabelText("Satellite image file")).toBeTruthy();
  });

  it("rejects malformed and incomplete browser profiles", () => {
    for (const stored of ["broken-json", "null", "{}", '{"error":"invalid token"}']) {
      localStorage.setItem("user", stored);
      expect(readUser()).toBeNull();
    }
  });

  it("loads a shipped sample and rejects an image exceeding the pixel limit", async () => {
    await openDashboard();
    fetchMock.mockImplementationOnce(async () => new Response("sample", { headers: { "Content-Type": "image/jpeg" } }));
    await userEvent.click(screen.getByRole("button", { name: "forest sample" }));
    await screen.findByText("EuroSAT-forest.jpg");
    await userEvent.click(screen.getByRole("button", { name: "Remove image" }));
    vi.mocked(createImageBitmap).mockResolvedValueOnce({ width: 5000, height: 5000, close: vi.fn() } as unknown as ImageBitmap);
    await userEvent.upload(screen.getByLabelText("Satellite image file"), new File(["image"], "huge.jpg", { type: "image/jpeg" }));
    expect((await screen.findByRole("alert")).textContent).toContain("16 million pixels");
    expect(screen.queryByRole("button", { name: "Analyze image" })).toBeNull();
  });
});
