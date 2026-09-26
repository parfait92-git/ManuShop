import {
  clearLocalSessionId,
  createLocalSessionId,
  getLocalSessionId,
} from "@/lib/sessionId";

describe("sessionId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is stored yet", () => {
    expect(getLocalSessionId()).toBeNull();
  });

  it("creates and persists a fresh id", () => {
    const id = createLocalSessionId();
    expect(id).toEqual(expect.any(String));
    expect(id.length).toBeGreaterThan(0);
    expect(getLocalSessionId()).toBe(id);
  });

  it("generates a different id on each call", () => {
    const first = createLocalSessionId();
    const second = createLocalSessionId();
    expect(first).not.toBe(second);
    expect(getLocalSessionId()).toBe(second);
  });

  it("removes the stored id on clear", () => {
    createLocalSessionId();
    clearLocalSessionId();
    expect(getLocalSessionId()).toBeNull();
  });

  it("degrades silently instead of throwing when storage is unavailable", () => {
    const blocked = () => {
      throw new Error("blocked");
    };
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    const removeItemSpy = jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(blocked);

    expect(() => getLocalSessionId()).not.toThrow();
    expect(getLocalSessionId()).toBeNull();
    expect(() => createLocalSessionId()).not.toThrow();
    expect(() => clearLocalSessionId()).not.toThrow();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });
});
