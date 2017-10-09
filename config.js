module.exports = {
  // agencies that you want workers to be managed automatically.
  autoupdate: ['nz-akl'],

  // how many minutes till first pull
  firstpull: 5,

  // tcp port where app should listen
  // uses randomized ports for workers.
  publicport: 8000,
  privateport: 8001,
}