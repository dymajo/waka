export function isKeyof<T extends object>(
  obj: T,
  possibleKey: keyof any
): possibleKey is keyof T {
  return possibleKey in obj
}

export const check = <T>(
  object: { [key: string]: T[] },
  key: string,
  item: T
) => {
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    object[key].push(item)
  } else {
    object[key] = [item]
  }
}
