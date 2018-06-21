const connection = require('../db/connection.js')
const sql = require('mssql')
const cache = require('../cache.js')
const log = require('../../server-common/logger.js')

const getColor = (agency_id, code) => {
  switch(agency_id) {
  case 'AM': // Auckland Metro
    switch (code) {
    case 'WEST': // West Line
      //return '#006553' official
      return '#4f9734'
    case 'STH': // South Line
      //return '#a60048' official
      return '#e52f2b'
    case 'EAST': // East Line
      return '#f39c12'
    case 'PUK': // South Line
      //return '#a60048'
      return '#e52f2b'
    case 'ONE': // ONE Line
      return '#21b4e3'
    default:
      return '#17232f'
    }
  case 'FGL': // Fullers
    return '#2756a4'

  case 'HE': // Howick and Eastern
    return '#2196F3'

  case 'NZBGW': // NZ Bus - Go West
    return '#4CAF50'

  case 'NZBML': // NZ Bus - metrolink
    switch (code) {
    case 'CTY': // City Link
      return '#ef3c34'

    case 'INN': // Inner Link
      return '#41b649'

    case 'OUT': // Outer Link
      return '#f7991c'
    
    default:
      return '#0759b0'
    }

  case 'NZBNS': // NZ Bus - North Star
    return '#f39c12'

  case 'NZBWP': // NZ Bus - Waka Pacific
    return '#0f91ab'

  case 'UE': // Urban Express / Same as Pavolich
    return '#776242'

  case 'BTL': // Birkenhead Transport
    return '#b2975b'

  case 'RTH': // Ritchies
    switch (code) {
    case 'NEX': // Northern Express
      //return '#0079c2' official
      return '#0056a9' 
    
    default:
      return '#ff6f2c'
    }

  case 'WBC': // Waiheke Bus Company
    return '#2196F3'

  case 'EXPNZ': // Explore Waiheke - supposed to be closed?
    return '#ffe81c'

  case 'BFL': // Belaire Ferries
    return '#ffd503'

  case 'ATAPT': // AT Airporter
    return '#f7931d'

  case 'SLPH': // Pine Harbour / Sealink
    return '#d92732'

  case 'GBT': // Go Bus
    return '#58aa17'

  case '360D': // 360 Discovery
    return '#2756a4'

  case 'ABEXP': //Skybus
    return '#F44336'

  case 'PC': // Pavolich
    return '#776242'

  default: //MSB, PBC, BAYES - Schools
    return '#17232f'
  }
}

const lineGroups = [

    {
      name: 'Central - Frequent',
      items: ['TAM', '18','20', '22', '24', '25', '27', '30', '32', '33', '66', '68', '70', '72', '75', '380'],
    },
    {
      name: 'Central - Connector',
      items: ['22N', '22R', '24B', '24R', '25B', '25L', '27H', '27W', '72C', '72M', '105', '106', '186', '195', '295', '309', '313', '323', '325', '650', '670', '712', '743', '744', '747', '751', '755', '762', '781'],
    },
    {
      name: 'Central - Local',
      items: ['107', '138', '161', '298', '321', '324', '326', '351', '650', '711', '782', '783'],
    },
    {
      name: 'Central - Peak Period',
      items: ['72X', '101', '209', '309X', '352', '774', '775'],
    },


]
const friendlyNames = {
  'NEX': 'Northern Express',
  'EAST': 'Eastern Line',
  'ONE': 'Onehunga Line',
  'STH': 'Southern Line',
  'WEST': 'Western Line',
  'PUK': 'Pukekohe Shuttle',
  'CTY': 'City Link',
  'INN': 'Inner Link',
  'OUT': 'Outer Link',
  '380': 'Airporter',
  'MTIA': 'Auckland to Waiheke Island',
  'SKY': 'SkyBus',
}
const allLines = {
  // CENTRAL - Frequent
  TAM: [['Britomart', 'Glen Innes']],
  '18': [['New Lynn', 'City', 'Great North Rd',]],
  '20': [['St Lukes',  'Wynyard Quarter', 'Kingsland']],
  '22': [['Avondale', 'City']],
  '24': [['Sandringham Shops', 'City']],
  '25': [['Mt Roskill', 'City']],
  '27': [['Three Kings', 'City']],
  '30': [['Onehunga',  'City','Manukau Rd',]],
  '32': [['Māngere', 'City', 'Otahuhu']],
  '33': [['Papakura', 'Otahuhu', 'Manukau']],
  '66': [['Pt Chevalier', 'Sylvia Park', 'Three Kings']],
  '68': [['New Lynn', 'Onehunga', 'Blockhouse Bay']],
  '70': [['Botany', 'City', 'Ellerslie']],
  '72': [['Howick', 'Panmure']],
  '75': [['Glen Innes', 'Wynyard Quarter']],
  '380': [['Onehunga', 'Manukau', 'Airport']],

  // CENTRAL - Connector
  '22R': [['New Lynn',        'City','New North Rd']],
  '22N': [['Rosebank Rd',     'City','New North Rd']],
  '24B': [['New Lynn',        'City','Boundary Rd']],
  '24R': [['New Lynn',        'City','Richardson Rd']],
  '25B': [['Blockhouse Bay',  'City','Dominion Rd']],
  '25L': [['Lynfield',        'City','Dominion Rd']],
  '27H': [['Hillsborough',    'City','Mt Eden Rd']],
  '27W': [['Waikowhai',       'City','Mt Eden Rd']],
  '72C': [['Botany', 'Panmure', 'Chapel Rd']],
  '72M': [['Botany', 'Panmure', 'Millhouse Dr']],
  '105': [['Westmere', 'City']],
  '106': [['City', 'Karangahape Rd', 'Freemans Bay']],
  '186': [['New Lynn', 'Astley Ave', 'Golf Rd']],
  '195': [['New Lynn', 'City', 'Great North Rd']],
  '295': [['Ellerslie', 'City', 'Epsom']],
  '309': [['Mangere', 'City', 'Queenstown Rd']],
  '313': [['Onehunga', 'Manukau', 'Mangere']],
  '323': [['Otahuhu', 'Panmure']],
  '325': [['Mangere', 'Manukau']],
  '650': [['Pt Chevalier', 'Glen Innes', 'Greenlane']],
  '670': [['New Lynn', 'Otahuhu', 'Onehunga']],
  '712': [['Bucklands Beach', 'Panmure']],
  '743': [['Onehunga', 'Glen Innes', 'Sylvia Park']],
  '744': [['Panmure', 'St Heliers', 'Glen Innes']],
  '747': [['Panmure', 'Glen Innes', 'Stonefields']],
  '751': [['Panmure', 'Newmarket']],
  '755': [['Benson Rd', 'City']],
  '762': [['Glen Innes', 'City']],
  '781': [['Mission Bay', 'Auckland Museum']],

  // CENTRAL - Local
  '107': [['New Lynn', 'Blockhouse Bay', 'Whitney St']],
  '138': [['Henderson', 'New Lynn', 'Rosebank Rd']],
  '161': [['Brains Park', 'New Lynn']],
  '298': [['Onehunga', 'Sylvia Park']],
  '321': [['Hospitals']],
  '324': [['Mangere', 'Seaside Park']],
  '326': [['Mangere', 'Otahuhu']],
  '351': [['Botany', 'Otahuhu']],
  '650X': [['Extension to Selwyn Village']],
  '711': [['Howick', 'Panmure']],
  '782': [['Sylvia Park', 'Mission Bay']],
  '783': [['Eastern Bays Loop']],

  // CENTRAL - Peak
  '72X': [['Botany', 'City', 'Southern Motorway']],
  '101': [['Pt Chevalier', 'City Universites']],
  '209': [['Titirangi', 'City']],
  '309X': [['Mangere', 'City']],
  '352': [['Panmure', 'Manukau']],
  '774': [['Mt Taylor Dr', 'City']],
  '775': [['Glendowie', 'City']],


} 

let lineOperators = {}
let lineColors = {}

function cacheOperatorsAndShapes() {
  let todo = []
  for (var key in allLines) {
    todo.push(key)
  }

  let getOperator = function(index) {
    if (index >= todo.length) {
      log('nz-akl'.magenta, 'Completed Lookup of Agencies')
      return
    }
    // caches the operator
    const sqlRequest = connection.get().request()
    sqlRequest.input('route_short_name', sql.VarChar(50), todo[index])
    sqlRequest.query(`
      SELECT top(1)
        agency_id
      FROM routes 
      where 
        route_short_name = @route_short_name
    `).then(result => {
      // query was successful
      if (result.recordset.length > 0) {
        const agency_id = result.recordset[0].agency_id
        lineColors[todo[index]] = getColor(agency_id, todo[index])
        lineOperators[todo[index]] = agency_id
      } else {
        log('could not find agency for', todo[index])
      }
      getOperator(index + 1)
    }).catch(err => console.warn(err))
  }
  getOperator(0)
}
// runs after initial cache get
cache.ready.push(cacheOperatorsAndShapes)

module.exports = {
  lineColors: lineColors,
  lineGroups: lineGroups,
  lineOperators: lineOperators,
  friendlyNames: friendlyNames,
  allLines: allLines,
  getColor: getColor,
}