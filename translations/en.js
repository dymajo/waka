export default {
  app: {
    name: 'Transit',
    nointernet: 'You are not connected to the internet.',
    error: 'An error occured.'
  },
  root: {
    stationsLabel: 'Stations',
    linesLabel: 'Lines',
  },
  onboarding: {
    welcome: {
      name: 'Welcome to %{appname}',
      description: '%{appname} is your realtime guide to Auckland Buses, Trains, and Ferries.',
    },
    lines: {
      name: 'Lines',
      description: 'View all Bus, Train, and Ferry services.',
    },
    install: {
      name: 'Install App',
      description: 'Add %{appname} to your home screen.',
      description2: 'Send %{appname} to your phone.',
    },
  },
  savedStations: {
    title: 'Saved Stations',
    empty: 'You haven’t saved any stations yet.',
    empty2: 'Save them and they’ll show up here.',
    stop: 'Stop %{number}',
    stops: 'Stops %{number}',
    multi: 'Multi Stop',
  },
  serviceAlerts: {
    title: 'Service Alerts',
    twitter: '@%{account} on Twitter',
  },
  search: {
    find: {
      title: 'Find Stop',
      description: 'Enter Stop Number',
      confirm: 'Go',
      cancel: 'Cancel',
    },
  },
  lines: {
    title: 'All Lines',
    more: '%{number} more',
    less: '%{number} less',
    error: 'We couldn’t download the lines.'
  },
  settings: {
    title: 'Settings',
    license: 'This app is licensed under the MIT License.',
    contributions: 'Contributions are welcome!',
    preferences: {
      title: 'Preferences',
      enabled: 'On',
      disabled: 'Off',
      hrs: '24 hour time',
      longnames: 'Long Route Names',
    },
    more: {
      title: 'More',
      feedback: 'Send Feedback',
      credits: 'View Credits',
    }
  },
  station: {
    bus: 'Bus Stop',
    train: 'Train Station',
    ferry: 'Ferry Terminal',
    noservices: 'There are no services in the next two hours.'
  },
  stationedit: {
    title: 'Edit Station',
    title2: 'Save Station',
    confirm: 'Save',
    cancel: 'Cancel',
    name: 'Stop Name',
    merge: 'Merge Stops',
    remove: 'Remove Stop',
  },
  tripitem: {
    via: 'via %{location}',
    due: 'Due', 
    stops: '%{smart_count} &stop |||| %{smart_count} &stops',
    minsaway: '%{time}&m',
    kmaway: '%{distance}&km,',
    min: '%{smart_count}& min |||| %{smart_count}& mins',
    and: 'and in&%{times}& min',
    last: 'Last',
    map: 'Map',
    timetable: 'Timetable'
  },
  timetable: {
    title: 'Timetable',
    header: '%{route} Timetable - %{appname}',
  },
  vech_loc: {
    header: '%{route} - Live Location - %{appname}',
    stop: 'Stop %{number}',
    services: 'View Services',
    timetable: 'Timetable',
  },
  specific: {
    auckland: {
      cfn: 'Congestion Free Network',
      ferries: 'Ferries',
      city: 'City & Isthmus',
      east: 'East',
      south: 'South',
      west: 'West',
      north: 'North Shore',
      night: 'Late Night',
      waiheke: 'Waiheke Island',
    }
  }
}