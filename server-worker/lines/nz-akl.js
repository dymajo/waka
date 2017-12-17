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
    name: 'Congestion Free Network',
    items: ['EAST','WEST','NEX','ONE','STH','PUK']
  },
  {
    name: 'Ferries',
    items: ['DEV','HMB','BIRK','BAYS','MTIA','SBAY','WSTH','RAK','PINE','HOBS']
  },
  {
    name: 'City & Isthmus',
    items: ['CTY', 'INN', 'OUT','SKY','005','007','008','009','010','011','020','030','220','221','221X','223','223X','243','243X','246','248','248X','249','255','255F','258','258F','258X','267','267F','267X','274','277','299','302','309','309X','31X','312','321','322','390','605','606','625','635','645','655','703','715','719','745','756','757','767','769','770','771']
  },
  {
    name: 'East',
    items: ['70','711','712','714','72C','72M','72X','733','734','735','739','505','515','525','532','595']
  },
  {
    name: 'South',
    items: ['31','32','33','35','313','314','324','325','326','351','352','353','355','360X','361','362','363','365','366','368','369','371','372','373','374','376','377','378','380','391','392','393','394','395','396','398','399']
  },
  {
    name: 'West',
    items: ['14T','14W','18','107','110','111','112','114','120','122','125','125X','129','131','132','132X','133','133X','134','138','141','142','143','146','151X','152','154','161','162','170','171','171X','172','172X','186','195','209']
  },
  {
    name: 'North',
    items: ['555','560','76X','779','802X','803','804','813','815','822','839','843','85X','858','86X','863X','87X','873','873X','874X','875','877X','879','880','881','882','886','887','891','891X','900X','905','911','913','915','920','921','922','945','945X','952','953','955','957','958','960','962','966','971','972','973','974','975','976','981','982','983','984','985','986','987','988','991X','992X']
  },
  {
    name: 'Late Night',
    items: ['70H', 'N26','N10','N11','N62','N83','N97']
  },
  {
    name: 'Waiheke Island',
    items: ['1','2','3','4']
  }
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
  // RAPID
  'NEX': [['Britomart', 'HC Station', 'all Busway Stations'], ['Britomart', 'Hibiscus Coast Station']],
  'EAST': [['Britomart Train Station', 'Manukau Train Station']],
  'ONE': [['Britomart Train Station', 'Onehunga Train Station']],
  'STH': [['Britomart Train Station', 'Papakura Train Station']],
  'WEST': [['Britomart Train Station', 'Swanson Train Station']],
  'PUK': [['Papakura Train Station', 'Pukekohe Train Station']],

  // FERRIES
  'DEV': [['Auckland', 'Devonport']],
  'HMB': [['Auckland', 'Half Moon Bay'], ['Auckland Pier 1', 'Half Moon Bay']],
  'BIRK': [['Auckland', 'Birkenhead', 'Northcote Point']],
  'BAYS': [['Auckland', 'Bayswater']],
  'MTIA': [['Auckland 2', 'Waiheke Island 1']],
  'SBAY': [['Auckland', 'Stanley Bay']],
  'WSTH': [['Auckland', 'West Harbour']],
  'RAK': [['Auckland', 'Rakino Island']],
  'PINE': [['Auckland', 'Pine Harbour']],
  'HOBS': [['Auckland', 'Hobsonville', 'Beach Haven']],


  // CITY
  'CTY': [['City Link', 'Wynyard Quarter', 'Greys Ave']],
  'INN': [['Inner Link Clockwise'],['Inner Link Anticlockwise']],
  'SKY': [['Downtown', 'International Airport', 'Mt Eden Rd'], ['Downtown', 'International Airport', 'Dominion Rd']],

  // ISTHMUS
  'OUT': [['Outer Link Clockwise'],['Outer Link Anticlockwise']],
  '005': [['Britomart', 'Pt Chevalier', 'Westmere']],
  '007': [['Pt Chevalier', 'St Heliers', 'Hospital And Selwyn Village'], ['Pt Chevalier', 'St Heliers', 'Selwyn Village And Hospital']],
  '008': [['New Lynn', 'Otahuhu']],
  '009': [['New Lynn', 'Sylvia Park', 'Blockhouse Bay Shops']],
  '010': [['Wynyard Quarter', 'Onehunga', 'Unitec']],
  '011': [['St Lukes', 'Onehunga']],
  '020': [['Britomart', 'Westmere', 'Wellington St']],
  '030': [['City Centre', 'Pt Chevalier']],
  '220': [['City Centre', 'Avondale', 'New North Rd']],
  '221': [['City Centre', 'Rosebank Rd', 'New North Rd']],
  '221X': [['City Centre', 'Rosebank Rd', 'New North Rd Express']],
  '223': [['City Centre', 'New Lynn', 'New North Rd']],
  '223X': [['City Centre', 'New Lynn', 'New North Rd Express']],
  '243': [['City Centre', 'New Lynn', 'Sandringham Rd']],
  '243X': [['City Centre', 'New Lynn', 'Sandringham Rd Express']],
  '246': [['City Centre', 'Wesley', 'Sandringham Rd']],
  '248': [['City Centre', 'Blockhouse Bay', 'Sandringham Rd']],
  '248X': [['City Centre', 'Blockhouse Bay', 'Sandringham Rd Express']],
  '249': [['City Centre', 'Blckhouse Bay and New Lynn', 'Sandringham Rd'], ['City Centre', 'New Lynn and Blckhouse Bay', 'Sandringham Rd']],
  '255': [['City Centre', 'May Rd']],
  '255F': [['City Centre', 'May Rd', 'Flyover']],
  '258': [['City Centre', 'Blockhouse Bay', 'Dominion Rd']],
  '258F': [['City Centre', 'Blockhouse Bay', 'Flyover']],
  '258X': [['City Centre', 'Blockhouse Bay', 'Dominion Rd Express']],
  '267': [['City Centre', 'Lynfield']],
  '267F': [['City Centre', 'Lynfield', 'Flyover']],
  '267X': [['City Centre', 'Lynfield Express'], ['City Centre Express', 'Lynfield']],
  '274': [['Britomart', 'Three Kings']],
  '277': [['Britomart', 'Waikowhai']],
  '299': [['Civic Centre', 'Lynfield', 'Waikowhai'], ['City Centre', 'Lynfield', 'Waikowhai']],
  '302': [['Civic Centre', 'Onehunga'], ['City Centre', 'Onehunga']],
  '309': [['City Centre', 'Mangere Town Centre']],
  '309X': [['City Centre', 'Mangere Town Centre Express'], ['City Centre (Express)', 'Mangere Town Centre']],
  '31X': [['City Centre', 'Onehunga Express', 'One Tree Hill'], ['City Centre Express', 'Onehunga', 'One Tree Hill']],
  '312': [['Civic Centre', 'Onehunga', 'Oranga'], ['City Centre', 'Onehunga', 'Oranga']],
  '321': [['Britomart', 'Middlemore Station', 'Greenlane']],
  '322': [['Britomart', 'Otahuhu Station', 'Great South Road']],
  '390': [['City Centre', 'Te Papapa']],

  // NORTH OF MOTORWAY ISTHMUS
  '605': [['Civic Centre', 'Lucerne Rd', 'Benson Rd'], ['City Centre', 'Lucerne Rd', 'Benson Rd']],
  '606': [['City Centre', 'Upland Rd', 'Lucerne Rd And Benson Rd']],
  '625': [['Britomart', 'Glen Innes', 'Khyber Pass Rd And Remuera Rd'], ['Britomart', 'Glen Innes', 'St Johns And Khyber Pass Rd']],
  '635': [['Britomart', 'Glen Innes', 'Parnell And Grand Dr'], ['Britomart', 'Glen Innes', 'Grand Dr And Parnell']],
  '645': [['Britomart', 'Glen Innes', 'Parnell and Remuera Rd']],
  '655': [['Britomart', 'Glen Innes', 'Meadowbank and Parnell']],
  '703': [['Britomart', 'Remuera', 'Portland Rd']],
  '715': [['Britomart', 'Glen Innes Centre', 'Orakei'], ['Britomart', 'Eastridge']],
  '719': [['Britomart', 'Sylvia Park']],
  '745': [['Britomart', 'Glen Innes Centre', 'Mission Bay']],
  '756': [['Britomart', 'Panmure', 'Mission Bay And Glen Innes'], ['Britomart', 'Panmure', 'Glen Innes And Mission Bay']],
  '757': [['Britomart', 'Otahuhu', 'Glen Innes And Mission Heights'], ['Britomart', 'Otahuhu', 'Panmure and Glen Innes and Mission']],
  '767': [['Britomart', 'Glendowie'], ['Britomart', 'Glendowie South', 'Tamaki Dr']],
  '769': [['Britomart', 'Glendowie North', 'Tamaki Dr']],
  '770': [['Newmarket', 'St Heliers', 'Kohimarama']],
  '771': [['Newmarket', 'St Heliers', 'Mission Bay']],

  // EAST
  '70': [['Britomart', 'Botany', 'Panmure']],
  '711': [['Panmure', 'Howick', 'Cascades Road']],
  '712': [['Panmure', 'Bucklands Beach']],
  '714': [['Half Moon Bay', 'Bucklands Beach']],
  '72C': [['Pamure To Howick And Botany Via Pakuranga Rd, Cook St, and C'], ['Botany And Howick To Panmure Via Chapel Rd, Cook St, And Pak']],
  '72M': [['Pamure to Howick and Botany via Pakuranga Rd, Meadowland Dr'], ['Botany and Howick to Panmure via Millhouse Dr, Meadowland Dr']],
  '72X': [['Britomart To Howick And Botany Express Via Motorway And Panm'], ['Botany And Howick To Britomart Express Via Panmure And Motor']],
  '733': [['Botany', 'Bucklands Beach', 'Highland Park']],
  '734': [['Botany', 'Half Moon Bay', 'Highland Park'], ['Botany To Half Moon BayýVia Highland Park']],
  '735': [['Botany', 'Half Moon Bay', 'Cockle Bay And Howick'], ['Botany', 'Half Moon Bay', 'Howick And Cockle Bay']],
  '739': [['Botany', 'Beachlands And Maraetai', 'Ormiston And Whitford'], ['Maraetai And Beachlands To BotanyýVia Whitford And Ormiston']],
  '505': [['Britomart', 'Sylvia Park', 'Ruawai Rd and Ellerslie']],
  '515': [['Britomart', 'Otahuhu Station', 'Ruawai Rd and Panama Rd']],
  '525': [['Britomart', 'Mt Wellington', 'Mt Wellington Highway'], ['Britomart', 'Sylvia Park', 'Mt Wellington Highway']],
  '532': [['Britomart', 'Otahuhu', 'Carbine Road'], ['Britomart', 'Otahuhu Station', 'Carbine Road']],
  '595': [['Britomart', 'Glen Innes', 'Panmure'], ['Britomart', 'Glen Innes Centre', 'Panmure And Ellerslie']],

  // SOUTH
  '31': [['Mangere Town Centre', 'Botany Town Centre', 'Otara']],
  '313': [['Onehunga', 'Manukau Station', 'Mangere & Papatoetoe'], ['Onehunga', 'Manukau Station', 'Papatoetoe & Mangere']],
  '314': [['Papatoetoe Station', 'Ormiston', 'Otara']],
  '32': [['Mangere Town Centre', 'Sylvia Park', 'Otahuhu']],
  '324': [['Mangere Town Centre', 'Seaside Park', 'Otahuhu']],
  '325': [['Mangere Town Centre', 'Manukau Station', 'Otahuhu And Otara'], ['Mangere Town Centre', 'Manukau Station', 'Otara And Otahuhu']],
  '326': [['Mangere Town Centre', 'Otahuhu Station', 'Tidal Road']],
  '33': [['Otahuhu Station', 'Papakura Interchange', 'Great South Rd']],
  '35': [['Manukau', 'Botany', 'Chapel Rd And Ormiston']],
  '351': [['Otahuhu Station', 'Botany', 'Highbrook']],
  '352': [['Manukau Station', 'Panmure', 'East Tamaki']],
  '353': [['Manukau Station', 'Botany Town Centre', 'Preston Rd']],
  '355': [['Manukau To Botany Via Ormiston And Mission Heights'],['Botany To Manukau Via Mission Heights And Ormiston']],
  '360X': [['City', 'Papakura', 'Manurewa (Express)']],
  '361': [['Manurewa Interchange', 'Otara / Mit', 'Mahia Rd']],
  '362': [['Manukau Station', 'Weymouth', 'Great South Rd']],
  '363': [['Manurewa Interchange', 'Wattle Downs Loop']],
  '365': [['Manukau Station', 'Papakura Interchange', 'Porchester Rd'], ['Manukau Station', 'Papakura Interchange Station', 'Porchest']],
  '366': [['Manurewa', 'Everglades', 'Manukau Station'], ['Everglades', 'Manurewa Interchange', 'Manukau Station']],
  '368': [['Wiri Industrial Loop Clockwise']],
  '369': [['Wiri Industrial Loop Anticlockwise']],
  '371': [['Papakura Interchange', 'Takanini Station']],
  '372': [['Papakura Shops', 'Keri Hill Loop']],
  '373': [['Papakura Shops', 'Red Hill']],
  '374': [['Papakura Shops', 'Opaheke Loop']],
  '376': [['Papakura Shops', 'Drury']],
  '377': [['Papakura Interchange', 'Pahurehure']],
  '378': [['Papakura Shops', 'Karaka Harbourside Loop']],
  '380': [['Onehunga', 'Manukau', 'Airport']],
  '391': [['Pukekohe Northeast Loop']],
  '392': [['Pukekohe Northwest Loop']],
  '393': [['Pukekohe South Loop']],
  '394': [['Pukekohe Interchange', 'Wesley College/Paerata']],
  '395': [['Papakura Interchange', 'Waiuku']],
  '396': [['Pukekohe Interchange', 'Waiuku', 'Patumahoe']],
  '398': [['Pukekohe', 'Tuakau']],
  '399': [['Pukekohe', 'Port Waikato', 'Tuakau']],

  // WEST
  '14T': [['New Lynn', 'Westgate', 'Triangle Rd, Lincoln Rd & Henderson'], ['New Lynn', 'Westgate', 'Henderson, Lincoln Rd & Triangle Rd']],  
  '14W': [['New Lynn', 'Westgate', 'Waimumu Rd, Lincoln Rd & Henderson'], ['New Lynn', 'Westgate', 'Henderson, Lincoln Rd & Waimumu Rd']],
  '18': [['City Centre', 'New Lynn', 'Great North Rd']],
  '107': [['Avondale Loop']],
  '110': [['City Centre', 'Westgate', 'Northwestern Motorway']],
  '111': [['Royal Heights Loop']],
  '112': [['Westgate', 'Hobsonville Point', 'West Harbour']],
  '114': [['Westgate', 'Hobsonville Pt', 'Whenuapai and Herald Island'], ['Westgate', 'Hobsonville Pt', 'Herald Island and Whenuapai']],
  '120': [['Henderson', 'Constellation Station', 'Westgate']],
  '122': [['Westgate', 'Huapai']],
  '125': [['Westgate', 'Helensville']],
  '125X': [['City Centre', 'Helensville', 'Westgate Express']],
  '129': [['City Centre', 'Westgate', 'Don Buck Rd']],
  '131': [['Henderson', 'Te Atatu Peninsula']],
  '132': [['City Centre', 'Te Atatu Peninsula']],
  '132X': [['City Centre', 'Te Atatu Peninsula Express'], ['City Centre Express', 'Te Atatu Peninsula']],
  '133': [['City Centre', 'Henderson', 'Te Atatu Rd']],
  '133X': [['City Centre', 'Henderson', 'Te Atatu Rd Express']],
  '134': [['City Centre', 'Henderson', 'Edmonton Rd']],
  '138': [['New Lynn', 'Henderson', 'Rosebank Rd']],
  '141': [['Henderson West Loop Anticlockwise']],
  '142': [['Henderson West Loop Clockwise']],
  '143': [['Henderson', 'Ranui', 'Sturges Rd']],
  '146': [['Henderson', 'Waitakere Village', 'Swanson and Central Park'], ['Henderson', 'Waitakere Village', 'Central Park Dr and Swans']],
  '151X': [['City Centre', 'Parrs Park', 'New Lynn Express']],
  '152': [['New Lynn', 'Henderson', 'Glen Eden and Sunnyvale'], ['New Lynn', 'Henderson', 'Sunnyvale and Glen Eden']],
  '154': [['New Lynn', 'Henderson', 'Glen Eden']],
  '161': [['New Lynn', 'Brains Park']],
  '162': [['New Lynn', 'Henderson', 'Glendene']],
  '170': [['New Lynn', 'Titirangi South']],
  '171': [['New Lynn', 'Laingholm']],
  '171X': [['City Centre', 'Laingholm Express'], ['City Centre Express', 'Laingholm']],
  '172': [['New Lynn', 'Glen Eden', 'Titirangi']],
  '172X': [['City Centre', 'Glen Eden', 'New Lynn and Titirangi Express'], ['City Centre', 'Glen Eden', 'Titirangi and New Lynn Express']],
  '186': [['South Lynn Loop']],
  '195': [['City Centre', 'New Lynn', 'Blockhouse Bay Rd And Green Bay'], ['New Lynn', 'City Centre', 'Green Bay And Blockhouse Bay Rd']],
  '209': [['City Centre', 'Titirangi', 'New North Rd And Green Bay'], ['City Centre', 'Titirangi', 'Green Bay And New North Rd']],

  // NORTH
  '555': [['Massey University', 'Highbury']],
  '560': [['Massey University', 'Glenfield']],
  '76X': [['Mayoral Dr', 'Long Bay Express'], ['City Centre Express', 'Long Bay']],
  '779': [['Devonport Wharf', 'Stanley Bay And Return'], ['Devonport Wharf', 'Cheltenham And Return']],
  '802X': [['Mayoral Dr', 'Bayswater Express'], ['Mayoral Dr Express', 'Bayswater']],
  '803': [['Takapuna Loop'], ['Takapuna', 'Bayswater', 'Francis St']],
  '804': [['Bayswater Wharf', 'Takapuna', 'Westlake']],
  '813': [['Takapuna', 'Devonport', 'Narrow Neck (R)']],
  '815': [['Devonport', 'Westwell Rd', 'Ngataringa Rd']],
  '822': [['Mayoral Dr', 'Castor Bay']],
  '839': [['Mayoral Dr', 'Long Bay', 'Crown Hill']],
  '843': [['Akoranga Station', 'Constellation Station', 'Takapuna']],
  '85X': [['Mayoral Dr', 'Torbay Express'], ['Mayoral Dr Express', 'Torbay']],
  '858': [['Mayoral Dr', 'Long Bay', 'North Shore Hospital'], ['City Centre', 'Long Bay', 'North Shore Hospital']],
  '86X': [['Mayoral Dr', 'Browns Bay Express'], ['Mayoral Dr Express', 'Browns Bay']],
  '863X': [['Mayoral Dr', 'Mairangi Bay Express'], ['City Centre Express', 'Mairangi Bay']],
  '87X': [['Mayoral Dr', 'Long Bay Express', 'Albany Station'], ['City Centre Express', 'Long Bay', 'Albany Station']],
  '873': [['Constellation Station', 'Takapuna']],
  '873X': [['Mayoral Dr', 'Constellation Station Express', 'Sunnynook'], ['City Centre Express', 'Constellation Station', 'Sunnynook']],
  '874X': [['Mayoral Dr', 'Constellation Station Express'], ['City Centre Express', 'Constellation Station']],
  '875': [['Mayoral Dr', 'Browns Bay']],
  '877X': [['Mayoral Dr', 'Torbay Express', 'Forrest Hill'], ['City Centre Express', 'Torbay', 'Forrest Hill']],
  '879': [['Mayoral Dr', 'Long Bay', 'Forrest Hill']],
  '880': [['Albany Loop Clockwise'], ['Albany Loop Anticlockwise']],
  '881': [['Newmarket', 'Albany Station']],
  '882': [['Albany Station', 'Torbay']],
  '886': [['Constellation Station', 'Long Bay', 'Browns Bay']],
  '887': [['Constellation Station', 'Long Bay', 'Albany']],
  '891': [['Takapuna', 'Albany Station']],
  '891X': [['Newmarket', 'Albany Village']],
  '900X': [['Mayoral Dr', 'Unsworth Heights Express'], ['City Centre Express', 'Unsworth Heights']],
  '905': [['Takapuna', 'Glenfield', 'Unsworth Heights']],
  '911': [['Takapuna', 'Glenfield', 'Northcote']],
  '913': [['Takapuna', 'Windy Ridge', 'North Shore Hospital']],
  '915': [['Takapuna', 'Bayview']],
  '920': [['Sylvan Ave', 'Mayoral Dr']],
  '921': [['Mayoral Dr', 'Hillcrest']],
  '922': [['Mayoral Dr', 'Takapuna', 'Northcote']],
  '945': [['Takapuna', 'Glenfield', 'Marlborough']],
  '945X': [['Mayoral Dr', 'Glenfield Express'], ['City Centre Express', 'Glenfield']],
  '952': [['Mayoral Dr', 'Glenfield Shops', 'Coronation Rd'], ['City Centre', 'Glenfield Shops', 'Coronation Rd']],
  '953': [['Universities', 'Windy Ridge']],
  '955': [['Britomart', 'Bayview']],
  '957': [['Birkenhead Wharf', 'Albany Station', 'Highbury']],
  '958': [['Britomart', 'Constellation Station', 'Onewa Rd']],
  '960': [['Highbury', 'Northcote Point'], ['Highbury Shops', 'Northcote Point']],
  '962': [['Newmarket', 'Albany Station', 'Ponsonby']],
  '966': [['Newmarket', 'Beach Haven', 'Ponsonby']],
  '971': [['Auckland University', 'Chatswood']],
  '972': [['Auckland University', 'Beach Haven Wharf']],
  '973': [['Britomart', 'Beach Haven', 'Birkdale Rd'], ['Verrans Corner', 'Britomart', 'Highbury Shops']],
  '974': [['Britomart', 'Beach Haven', 'Rangatira Rd'], ['Verrans Corner', 'Britomart']],
  '975': [['Takapuna', 'Beach Haven Wharf', 'Birkdale Rd'], ['Takapuna', 'Beach Haven', 'Birkdale Rd']],
  '976': [['Takapuna', 'Beach Haven', 'Rangatira Rd'], ['Takapuna', 'Beach Haven Wharf', 'Rangatira Rd']],
  '981': [['HC Station', 'Waiwera']],
  '982': [['HC Station', 'Gulf Harbour']],
  '983': [['HC Station', 'Gulf Harbour', 'Silverdale, Red Beach, Vipond'], ['HC Station', 'Gulf Harbour', 'Manly shops, Vipond Rd, Red B']],
  '984': [['HC Station to Orewa, via Silverdale and Red Beach Rd'], ['Orewa to HC Station, via Maygrove, Red Beach and Silverdale']],
  '985': [['HC Station', 'Orewa', 'Silverdale and Millwater'], ['HC Station', 'Orewa', 'Millwater and Silverdale']],
  '986': [['HC Station', 'Albany Station', 'Dairy Flat Highway, Massey'], ['HC Station', 'Albany Station', 'Albany Centre, Massey Uni']],
  '987': [['Arkles Bay to The Plaza']],
  '988': [['Gulf Harbour Ferry', 'The Plaza', 'Shakespear Regional Park']],
  '991X': [['City Centre (Wellesley St)', 'Waiwera', 'HC Station']],
  '992X': [['City Centre (Wellesley St)', 'Gulf Harbour', 'HC Station']],

  // LATE NIGHT
  '70H': [['Britomart', 'Howick And Botany', 'Ellerslie And Panmure']],
  'N26': [['City Centre To Lynfield Via Dominion Rd']],
  'N10': [['City To Otara Via Manukau Rd, Onehunga, Mangere, Papatoetoe']],
  'N11': [['City To Papakura Via Great South Rd']],
  'N62': [['City Centre To Orakei V Remuera GlenInnes And StHeliers']],
  'N83': [['City Centre To Takapuna And East Coast Bays']],
  'N97': [['City Centre To Birkenhead Via Beach Haven And Glenfield Rd'], ['Onewa', 'City Centre']],

  '1': [['Matiatia Wharf', 'Onetangi']],
  // '1a': [['Matiatia Wharf', 'Onetangi', 'Seaview Rd']],
  '2': [['Matiatia Wharf', 'Rocky Bay']],
  '3': [['Matiatia Wharf', 'Rocky Bay', 'Ostend & Onetangi'], ['Matiatia', 'Rocky Bay', 'Onetangi and Ostend']],
  '4': [['Matiatia Wharf', 'Onetangi Direct']],
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
  colorFn: getColor,
}