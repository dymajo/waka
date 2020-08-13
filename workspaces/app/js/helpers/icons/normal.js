// How this file works!
//
// If there is no matching override, the application will fallback
// to the value specified in default.
// Keys will have to exist though, otherwise the unknown icon is used.
export const normalMetadata = {
  default: {
    size: {
      width: 28,
      height: 34,
    },
  },
  'default-selection': {
    size: {
      width: 28,
      height: 28,
    },
  },
  train: {},
  bus: {
    size: {
      width: 26,
      height: 32,
    },
  },
  ferry: {},
  cablecar: {},
  parkingbuilding: {
    size: {
      width: 28,
      height: 28,
    },
  },
}
