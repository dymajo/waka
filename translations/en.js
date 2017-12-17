export default {
  app: {
    name: 'Waka',
    nointernet: 'You are not connected to the internet.',
    error: 'An error occured.',
    errorRetry: 'Retry',
  },
  regions: {
    'pick': 'Pick City',
    'au-syd': 'Sydney',
    'au-syd-long': 'New South Wales, Sydney',
    'nz-akl': 'Auckland',
    'nz-akl-long': 'Tāmaki Makaurau, Auckland',
    'nz-wlg': 'Wellington',
    'nz-wlg-long': 'Te Whanganui-a-Tara, Wellington',
    'vote': 'Want to use %{appname} in your city?',
    'activator': 'Let us know!',
  },
  root: {
    stationsLabel: 'Stations',
    linesLabel: 'Lines',
  },
  onboarding: {
    welcome: {
      name: 'Kia Ora! Welcome to %{appname}.',
      description: '%{appname} is your realtime guide to public transport in Auckland and Wellington.',
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
    sponsor: {
      name: 'Become a Sponsor',
      description: 'Contribute to help support development!'
    }
  },
  savedStations: {
    title: 'Saved Stations',
    empty: 'You haven’t saved any stations yet.',
    empty2: 'Save them and they’ll show up here.',
    stop: 'Stop %{number}',
    stops: 'Stops %{number}',
    multi: 'Multi Stop',
    more: 'More',
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
  sponsor: {
    title: 'Contribute',
    slug: '%{appname} is free, open source software.',
    slug2: 'Help us build the world’s best transit app.',
    email: 'Get in Touch',
    sponsorTitle: 'Become a Sponsor',
    sponsorDescription: 'If you want your business to appear on the map or elsewhere in the app, you can become a sponsor!',
    patreonTitle: 'Patreon',
    patreonDescription: 'Help cover our costs and support development by becoming a patron.',
    contributeTitle: 'Contribute Code',
    contributeDescription: 'Want to improve %{appname} directly? %{appname} is open source software, so check out the issues and submit a pull request!',
    translateTitle: 'Translations',
    translateDescription: 'Spot an issue in a translation, or want to translate %{appname} into another language?',
  },
  station: {
    lightrail: 'Light Rail Stop',
    bus: 'Bus Stop',
    train: 'Train Station',
    ferry: 'Ferry Terminal',
    cablecar: 'Cable Car Station',
    noservices: 'There are no services in the next two hours.',
    error: 'We couldn’t get stop times for this station.'
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
    kmaway: '%{distance}&km',
    min: '%{smart_count}& min |||| %{smart_count}& mins',
    and: 'and in&%{times}& min',
    last: 'Last',
    map: 'Route Map',
    timetable: 'Timetable'
  },
  timetable: {
    title: 'Timetable',
    header: '%{route} Timetable - %{appname}',
    error: 'We couldn’t get the timetable for this route.',
    empty: 'There were no services found today.'
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