export const LAST_STICK_START = 21;
export function resolveLastStick(
  remaining: number,
  take: number,
  spark = false,
) {
  if (
    !Number.isInteger(remaining) ||
    remaining < 1 ||
    remaining > LAST_STICK_START
  )
    throw new Error("This pile is not active.");
  if (!Number.isInteger(take) || take < 1 || take > 3 || take > remaining)
    throw new Error("Take one, two or three remaining sticks.");
  const bonus = spark && remaining > take ? 1 : 0;
  return {
    remaining: remaining - take - bonus,
    removed: take + bonus,
    bonus,
    complete: remaining === take + bonus,
  };
}
export function decideLastStick(remaining: number) {
  if (
    !Number.isInteger(remaining) ||
    remaining < 1 ||
    remaining > LAST_STICK_START
  )
    throw new Error("No legal AI move.");
  return remaining % 4 || 1;
}
