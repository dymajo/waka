export default {
  app: {
    name: 'Waka',
    nointernet: 'You are not connected to the internet.',
    error: 'An error occured.',
    errorRetry: 'Retry',
  },
  regions: {
    error: 'We couldn’t get any cities.',
    pick: 'Pick City',
    vote: 'Want to use %{appname} in your city?',
    activator: 'Let us know!',
  },
  root: {
    stationsLabel: 'Stations',
    linesLabel: 'Lines',
    guideLabel: 'Guidebook',
  },
  onboarding: {
    welcome: {
      name: 'Kia Ora! Welcome to %{appname}.',
      description:
        '%{appname} is your realtime guide to public transport in Auckland and Wellington',
    },
    lines: {
      name: 'Lines',
      description: 'View all Bus, Train, and Ferry services',
    },
    install: {
      name: 'Install App',
      description: 'Add %{appname} to your home screen',
      description2: 'Send %{appname} to your phone',
    },
    city: {
      name: 'Switch City',
      description: 'Get directions in another city',
    },
    feedback: {
      name: 'Give Feedback',
      description: 'Let us know how we can improve Waka!',
    },
    settings: {
      name: 'Settings',
      description: 'Preferences & Credits',
    },
    guidebook: {
      name: 'Guidebook',
      description: 'Local tips for getting around %{city}',
    },
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
    error: 'We couldn’t download the lines.',
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
      sponsor: 'Support Waka',
      credits: 'View Credits',
    },
  },
  notFound: {
    header: 'Not Found',
    body: 'Sorry, but the page you were trying to view does not exist.',
    home: 'Return Home',
  },
  errorBoundary: {
    header: 'Error!',
    unexpected:
      'There was an unexpected error. You can send feedback, try reload this page, or return home.',
    feedback: 'Send Feedback',
    reload: 'Reload Page',
    home: 'Return Home',
  },
  sponsor: {
    title: 'Contribute',
    slug: '%{appname} is free, open source software.',
    slug2: 'Help us build the world’s best transit app.',
    email: 'Get in Touch',
    sponsorTitle: 'Become a Sponsor',
    sponsorDescription:
      'If you want your business to appear on the map or elsewhere in the app, you can become a sponsor!',
    patreonTitle: 'Patreon',
    patreonDescription:
      'Help cover our costs and support development by becoming a patron.',
    contributeTitle: 'Contribute Code',
    contributeDescription:
      'Want to improve %{appname} directly? %{appname} is open source software, so check out the issues and submit a pull request!',
    translateTitle: 'Translations',
    translateDescription:
      'Spot an issue in a translation, or want to translate %{appname} into another language?',
  },
  station: {
    parkingbuilding: 'Parking Building',
    lightrail: 'Light Rail Stop',
    bus: 'Bus Stop',
    train: 'Train Station',
    ferry: 'Ferry Terminal',
    cablecar: 'Cable Car Station',
    noservices: 'There are no services in the next two hours.',
    error: 'We couldn’t get stop times for this station.',
    subway: 'Subway Station',
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
  },
  vech_loc: {
    header: '%{route} - Live Location - %{appname}',
    stop: 'Stop %{number}',
    services: 'View Services',
  },
  feedback: {
    header: 'Give Feedback',
    generalFeedback:
      'We would love to hear any feedback so we can improve Waka for you!',
    errorReport:
      'We apologize for the issue you encountered. Please let us know what happened, so we can fix it!',
    email: 'Email (optional)',
    message: 'Feedback',
    send: 'Send Feedback',
    complete: 'Thank you for your feedback!',
    completeFollowup: 'Thank you feedback! We’ll be in touch.',
    done: 'Done',
    error: 'An error occured.',
  },
}
