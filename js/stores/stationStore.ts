export namespace StationStore {
  export function getData() {
    return {
      '8439': {
        name: 'Youth Street',
        icon: '🚍',
        description: 'Stop 8439 / 1153 Dominion Road'
      },
      '0133': {
        name: 'Britomart',
        icon: '🚆',
        description: 'Britomart Train Station, Auckland Central'
      },
      '7058': {
        name: 'Civic',
        icon: '🚍',
        description: 'Stop 7058 / Queen Street outside St James'
      },
      '7056': {
        name: 'Civic Express',
        icon: '🚍',
        description: 'Stop 7056 / Queen Street outside St James'
      },
      '9630': {
        name: 'Downtown Ferry Terminal',
        icon: '🛳',
        description: 'To Devonport'
      },
      '7148': {
        name: 'Upper Symonds',
        icon: '🚍',
        description: 'Stop 7148 / 36 Symonds Street'
      }
    }
  }
  export function getOrder() {
    return ['8439','0133','7058','7056','9630','7148']
  }
}