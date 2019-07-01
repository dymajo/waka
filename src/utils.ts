export function isKeyof<T extends object>(
  obj: T,
  possibleKey: keyof any
): possibleKey is keyof T {
  return possibleKey in obj
}
