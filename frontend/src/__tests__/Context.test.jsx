import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useContext } from "react";
import axios from "axios";
import ContextProvider, { AppContext } from "../Context";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const Consumer = () => {
  const { latest, past, isRefreshing, error } = useContext(AppContext);
  return (
    <div>
      <div data-testid="latest">{latest?.crowd_level ?? "none"}</div>
      <div data-testid="past">{past.length}</div>
      <div data-testid="refreshing">{String(isRefreshing)}</div>
      <div data-testid="error">{error}</div>
    </div>
  );
};

describe("Context polling", () => {
  let intervalSpy;
  let intervalCallback;

  beforeEach(() => {
    intervalCallback = null;
    intervalSpy = vi
      .spyOn(global, "setInterval")
      .mockImplementation((callback, delay) => {
        intervalCallback = { callback, delay };
        return 1;
      });
    axios.get.mockResolvedValue({ data: { latest: null, quarters: [] } });
  });

  afterEach(() => {
    intervalSpy.mockRestore();
    vi.clearAllMocks();
  });

  test("refreshes immediately and every 5 seconds", async () => {
    render(
      <ContextProvider>
        <Consumer />
      </ContextProvider>,
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    const intervalCalls = intervalSpy.mock.calls.map((call) => call[1]);
    expect(intervalCalls).toContain(5000);
    expect(intervalCallback).not.toBeNull();
  });

  test("surfaces error when API request fails", async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { error: "Backend unavailable" } },
    });

    render(
      <ContextProvider>
        <Consumer />
      </ContextProvider>,
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/crowd\/latest$/),
        expect.any(Object),
      ),
    );

    await waitFor(() =>
      expect(screen.getByTestId("error").textContent).toContain(
        "Backend unavailable",
      ),
    );
  });
});
