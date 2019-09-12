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

export const sortFn = (a: string[], b: string[]) => {
  const first = a[0][0]
  const second = b[0][0]
  // put night buses last
  if (first === 'N' && second !== 'N') {
    return 1
  }
  if (first !== 'N' && second === 'N') {
    return -1
  }
  // put lettered services first
  if (
    Number.isNaN(parseInt(first, 10)) &&
    !Number.isNaN(parseInt(second, 10))
  ) {
    return -1
  }
  if (
    !Number.isNaN(parseInt(first, 10)) &&
    Number.isNaN(parseInt(second, 10))
  ) {
    return 1
  }
  return a[0].localeCompare(b[0], undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

export const prefixToTimezone = (prefix: string) => {
  switch (prefix) {
    case 'au-syd':
      return 'Australia/Sydney'
    case 'au-mel':
      return 'Australia/Melbourne'
    case 'au-per':
      return 'Australia/Perth'
    case 'us-nyc':
      return 'America/New_York'
    case 'nz-akl':
    case 'nz-chc':
    case 'nz-wlg':
    default:
      return 'Pacific/Auckland'
  }
}
