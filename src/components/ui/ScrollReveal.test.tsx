import { act, render, screen } from "@testing-library/react";

import { ScrollReveal } from "./ScrollReveal";

// The "unsupported IntersectionObserver" fallback reveals via a queued
// microtask (see ScrollReveal.tsx). Any test rendering it must flush that
// microtask itself before returning — an afterEach hook runs too late, since
// Jest already drains the microtask queue while awaiting the test's own
// promise, outside of any act() scope.
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("ScrollReveal", () => {
  it("renders hidden on the initial synchronous render, regardless of IntersectionObserver support", async () => {
    // jsdom has no IntersectionObserver, matching the server environment.
    // The initial render must stay hidden either way, otherwise the
    // server-rendered markup and the client's first render diverge and
    // React throws a hydration mismatch.
    expect(typeof IntersectionObserver).toBe("undefined");

    render(<ScrollReveal>Contenu</ScrollReveal>);

    expect(screen.getByText("Contenu").className).not.toContain(
      "reveal--visible"
    );

    await flushMicrotasks();
  });

  it("reveals itself asynchronously when IntersectionObserver is unsupported", async () => {
    render(<ScrollReveal>Contenu</ScrollReveal>);

    await flushMicrotasks();

    expect(screen.getByText("Contenu").className).toContain(
      "reveal--visible"
    );
  });

  it("reveals itself once the element intersects the viewport", () => {
    const observe = jest.fn();
    const unobserve = jest.fn();
    const disconnect = jest.fn();
    let observerCallback: IntersectionObserverCallback = () => {};

    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
    }

    // @ts-expect-error minimal fake for the parts ScrollReveal uses
    global.IntersectionObserver = FakeIntersectionObserver;

    const { unmount } = render(<ScrollReveal>Contenu</ScrollReveal>);
    const node = screen.getByText("Contenu");

    expect(observe).toHaveBeenCalledWith(node);
    expect(node.className).not.toContain("reveal--visible");

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(node.className).toContain("reveal--visible");
    expect(unobserve).toHaveBeenCalledWith(node);

    unmount();
    expect(disconnect).toHaveBeenCalled();

    // @ts-expect-error cleanup the global fake
    delete global.IntersectionObserver;
  });

  it("does not reveal when the observed entry is not intersecting", () => {
    let observerCallback: IntersectionObserverCallback = () => {};

    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    }

    // @ts-expect-error minimal fake for the parts ScrollReveal uses
    global.IntersectionObserver = FakeIntersectionObserver;

    render(<ScrollReveal>Contenu</ScrollReveal>);
    const node = screen.getByText("Contenu");

    act(() => {
      observerCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(node.className).not.toContain("reveal--visible");

    // @ts-expect-error cleanup the global fake
    delete global.IntersectionObserver;
  });

  it("forwards delay and distance as CSS custom properties", async () => {
    render(
      <ScrollReveal delay={200} distance={40}>
        Contenu
      </ScrollReveal>
    );

    const node = screen.getByText("Contenu");
    expect(node.style.getPropertyValue("--reveal-delay")).toBe("200ms");
    expect(node.style.getPropertyValue("--reveal-distance")).toBe("40px");

    await flushMicrotasks();
  });

  it("renders the element type passed via the `as` prop", async () => {
    render(<ScrollReveal as="section">Contenu</ScrollReveal>);

    expect(screen.getByText("Contenu").tagName).toBe("SECTION");

    await flushMicrotasks();
  });
});
