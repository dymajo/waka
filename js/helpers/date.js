export const prefixToTimezone = prefix => {
  switch (prefix) {
  case 'au-syd':
    return 'Australia/Sydney'
  case 'au-mel':
    return 'Australia/Melbourne'
  case 'au-per':
    return 'Australia/Perth'
  case 'us-nyc':
    return 'America/New_York'
  case 'nz-wlg':
  case 'nz-akl':
  default:
    return 'Pacific/Auckland'
  }
}
