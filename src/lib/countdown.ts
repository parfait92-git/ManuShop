export interface TimeParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

export function getTimeParts(targetMs: number, nowMs: number): TimeParts {
  const diff = Math.max(0, targetMs - nowMs)

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    expired: diff === 0,
  }
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0")
}
