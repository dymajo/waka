if (agency === 'nzbgw' || agency === 'nzbwp' || agency === 'nzbml' || agency === 'nzbns') {
  agency = 'nzb'
  offset = 10000
} else if (agency === 'rth') {
  offset = 21000
} else if (agency === 'btl') {
  offset = 21000
} else if (agency === 'ue') {
  offset = 23000
} else if (agency === 'he') {
  offset = 24000
} else if (agency === 'abexp') {
  offset = 25000
} else if (agency === 'wbc') {
  offset = 32000
}

let transformCompanies = function(agency) {
  switch (agency) {
    case 'AIRBUS EXPRESS':
      return 'ABEXP'
    case 'BAYES':
      return 'BAYES'
    case 'BIRKENHEAD TRANSPORT':
      return 'BTL'
    case 'HOWICK & EASTERN':
      return 'HE'
    case 'NZ BUS':
      return 'NZB'
    case 'RITCHIES':
      return 'RTH'
    case 'URBAN EXPRESS':
      return 'UE'
    case 'WAIHEKE BUS COMPANY':
      return 'WBC'
  }
  return false
}
let transformModels = function(model) {
  if (model === 'ADL-E200' || model === 'ADL ENVIRO 200') {
    return 'Alexander Dennis Enviro200'
  } else if (model === 'ADL-E500' || model === 'ADL ENVIRO 500') {
    return 'Alexander Dennis Enviro500'
  } else if (model.match('M.A.N')) {
    return model.replace('M.A.N', 'MAN')
  } else if (model.match('Man')) {
    return model.replace('Man', 'MAN')
  }
  return model
}