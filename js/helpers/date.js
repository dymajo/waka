export const getTime = (date, isTwentyFourHour, showDue) => {
  const now = new Date()
  if (date <= now) {
    if (showDue === true) {
      return {
        text: 'Due',
      }
    }
    return {
      minutes: '0', // hack - using a string is != false
    }
  }
  const minutes = Math.ceil((date.getTime() - now.getTime()) / 60000)
  if (minutes > 90) {
    // be careful using 'default' as it will use browser default time formatting
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString#Using_locales
    const dateText = date.toLocaleTimeString('default', {
      // get 24h time from settings
      hour12: !isTwentyFourHour,
      hour: 'numeric',
      minute: 'numeric',
    })
    // if us -> AM/PM, if au/nz -> am/pm, if gb -> 24h
    return {
      text: dateText.replace(/ (AM|PM|am|pm)/, ''),
      subtext: dateText.match(/ (AM|PM|am|pm)/)
        ? dateText.match(/ (AM|PM|am|pm)/)[0].toLowerCase()
        : null,
    }
  }
  // This enables hours, but we don't want that
  // if (minutes >= 60) {
  //   return {
  //     hours: Math.floor(minutes / 60),
  //     minutes: minutes % 60,
  //   }
  // }
  return {
    minutes,
  }
}
