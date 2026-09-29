import { playNotificationSound } from "./notificationSound";

describe("playNotificationSound", () => {
  it("does nothing when the Web Audio API is unavailable (jsdom, old browsers)", () => {
    expect(() => playNotificationSound("order")).not.toThrow();
  });

  it("plays a short tone through the Web Audio API when available", () => {
    const start = jest.fn();
    const stop = jest.fn();
    const connect = jest.fn();
    const oscillator = {
      type: "",
      frequency: { value: 0 },
      connect,
      start,
      stop,
    };
    const gain = {
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    };
    const resume = jest.fn().mockResolvedValue(undefined);
    const AudioContextMock = jest.fn().mockImplementation(() => ({
      state: "suspended",
      currentTime: 0,
      resume,
      createOscillator: () => oscillator,
      createGain: () => gain,
      destination: {},
    }));
    window.AudioContext = AudioContextMock as unknown as typeof AudioContext;

    playNotificationSound("message");

    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalled();
    expect(oscillator.frequency.value).toBe(523);
    expect(oscillator.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalled();
    expect(start).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();

    // Un deuxième appel réutilise le même AudioContext plutôt que d'en
    // recréer un (le navigateur en limite le nombre simultané).
    playNotificationSound("order");
    expect(AudioContextMock).toHaveBeenCalledTimes(1);

    // @ts-expect-error nettoyage du test double
    delete window.AudioContext;
  });
});
