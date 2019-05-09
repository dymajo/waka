/* eslint-disable no-console */

const log = (...args: any[]) => {
  const print = Array.from(args)
  console.log(...print)
}
export default log
