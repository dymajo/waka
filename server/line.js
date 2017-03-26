var request = require('request')
var azure = require('azure-storage')
var wkx = require('wkx')
var cache = require('./cache')

var tableSvc = azure.createTableService()
var blobSvc = azure.createBlobService()

blobSvc.createContainerIfNotExists('shapewkb', function(error, result, response){
  if (error) {
    throw error
  }
})

var shapeWKBOptions = {
  url: 'https://api.at.govt.nz/v2/gtfs/shapes/geometry/',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}
let lineOperators = {}
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
    items: ['CTY', 'INN', 'OUT','005','007','008','009','010','011','020','030','220','221','222','223','224','233','243','243X','246','248','248X','249','255','258','258X','267','267X','274','277','299','302','309','309X','31X','312','321','322','390','605','606','625','635','645','655','703','715','719','745','756','757','767','769','770','771']
  },
  {
    name: 'East',
    items: ['500','501','515','525','532','545','550','551','552','565','575','580','589','595']
  },
  {
    name: 'South',
    items: ['31','32','33','313','314','324','325','326','352','353','360X','361','362','363','365','366','368','369','371','372','373','374','376','377','378','380','391','392','393','394','395','396','398','399']
  },
  {
    name: 'West',
    items: ['04X','048','049','060','07X','070','079','080','081','085','087','09X','090','091','092','093','095','097','102','104','11X','113','115','121','13X','130','135','136','145','149','15X','153','154','156','170','171','171X','172','172X','186','195','209']
  },
  {
    name: 'North',
    items: ['555','560','76X','779','802X','803','804','813','815','822','839','843','85X','858','86X','863X','87X','873','873X','874X','875','879','880','881','882','886','887','891','891X','900X','905','911','913','915','920','921','922','945','945X','952','953','955','956','957','958','960','962','966','971','972','973','974','975','976','981','982','983','984','985','986','987','988','991X','992X']
  },
  {
    name: 'Late Night',
    items: ['N05','N13','N24','N26','N10','N11','N50','N62','N83','N97']
  },
  {
    name: 'Waiheke Island',
    items: ['1','1a','2','3','4']
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
  '220': [['Midtown', 'St Lukes'], ['City Centre', 'St Lukes']],
  '221': [['Midtown', 'Rosebank Rd'], ['City Centre', 'Rosebank Rd']],
  '222': [['Midtown', 'Patiki Rd'], ['City Centre', 'Patiki Rd']],
  '223': [['Midtown', 'New Lynn'], ['City Centre', 'New Lynn']],
  '224': [['Midtown', 'Henderson', 'St Lukes And New Lynn'], ['City Centre', 'Henderson']],
  '233': [['Midtown', 'New Lynn', 'Sandringham Road and St Lukes'], ['City Centre', 'New Lynn', 'Sandringham Road and St Lukes']],
  '243': [['Midtown', 'New Lynn', 'Sandringham Road'], ['City Centre', 'New Lynn', 'Sandringham Rd']],
  '243X': [['Midtown', 'New Lynn Express', 'Owairaka'], ['City Centre Express', 'New Lynn', 'Owairaka']],
  '246': [['Midtown', 'Wesley']],
  '248': [['Midtown', 'Blockhouse Bay'], ['Midtown', 'Blockhouse Bay', 'Sandringham Rd']],
  '248X': [['Midtown', 'Blockhouse Bay Express', 'New Windsor'], ['Midtown Express', 'Blockhouse Bay', 'New Windsor']],
  '249': [['Midtown', 'New Lynn', 'Sandringham Rd and Blockhouse Bay'], ['City Centre', 'New Lynn', 'Blockhouse Bay and Sandringham R']],
  '255': [['Civic Centre', 'May Rd'], ['Civic Centre', 'May Rd', 'Flyover']],
  '258': [['Civic Centre', 'Blockhouse Bay'], ['Civic Centre', 'Blockhouse Bay', 'Flyover']],
  '258X': [['Civic Centre', 'Blockhouse Bay Express'], ['Civic Centre Express', 'Blockhouse Bay']],
  '267': [['Civic Centre', 'Lynfield'], ['Civic Centre', 'Lynfield', 'Flyover']],
  '267X': [['Civic Centre', 'Lynfield Express'], ['Civic Centre Express', 'Lynfield']],
  '274': [['Britomart', 'Three Kings']],
  '277': [['Britomart', 'Waikowhai']],
  '299': [['Civic Centre', 'Lynfield', 'Waikowhai'], ['City Centre', 'Lynfield', 'Waikowhai']],
  '302': [['Civic Centre', 'Onehunga'], ['City Centre', 'Onehunga']],
  '309': [['Civic / Queen St', 'Mangere Town Centre'], ['City Centre', 'Mangere Town Centre']],
  '309X': [['Civic / Queen St', 'Mangere Town Centre (Express)'], ['City Centre (Express)', 'Mangere Town Centre']],
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
  '500': [['Britomart', 'Mission Heights', 'Botany Town Centre']],
  '501': [['Britomart', 'Cockle Bay', 'Botany Town Centre']],
  '515': [['Britomart', 'Otahuhu Station', 'Ruawai Rd and Panama Rd']],
  '525': [['Britomart', 'Mt Wellington', 'Mt Wellington Highway'], ['Britomart', 'Sylvia Park', 'Mt Wellington Highway']],
  '532': [['Britomart', 'Otahuhu', 'Carbine Road'], ['Britomart', 'Otahuhu Station', 'Carbine Road']],
  '545': [['Botany Town Centre', 'Bucklands Beach', 'Highland Park']],
  '550': [['Britomart', 'Cockle Bay', 'Newmarket']],
  '551': [['Britomart', 'North Park', 'Newmarket']],
  '552': [['Britomart', 'Bucklands Beach', 'Newmarket']],
  '565': [['Botany Town Centre', 'Half Moon Bay', 'Gossamer Dr']],
  '575': [['Middlemore', 'Half Moon Bay', 'Otara And Highbrook']],
  '580': [['Howick', 'Manukau City Centre', 'Botany Town Centre'], ['Howick', 'Manukau Station', 'Botany Town Centre']],
  '589': [['Botany Town Centre', 'Maraetai'], ['Botany Town Centre', 'Beachlands And Maraetai', 'Flat Bush']],
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
  '352': [['Manukau Station', 'Panmure', 'East Tamaki']],
  '353': [['Manukau Station', 'Botany Town Centre', 'Preston Rd']],
  '360X': [['City', 'Papakura', 'Manurewa (Express)']],
  '361': [['Manurewa Interchange', 'Otara / Mit', 'Mahia Rd']],
  '362': [['Manukau Station', 'Weymouth', 'Great South Rd']],
  '363': [['Manurewa Interchange', 'Wattle Downs Loop']],
  '365': [['Manukau Station', 'Papakura Interchange', 'Porchester Rd'], ['Manukau Station', 'Papakura Interchange Station', 'Porchest']],
  '366': [['Manukau Station', 'Manurewa Interchange', 'The Gardens'], ['Manukau Station', 'Manurewa', 'The Gardens']],
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
  '04X': [['City Centre', 'Te Atatu Peninsula Express'], ['City Centre Express', 'Te Atatu Peninsula']],
  '048': [['City Centre', 'Te Atatu Peninsula']],
  '049': [['City Centre', 'Henderson', 'Te Atatu Peninsula'], ['City Centre', 'Henderson', 'Te Atatu Penninsula']], // wtf spelling
  '060': [['City Centre', 'Helensville']],
  '07X': [['City Centre', 'Parrs Park Express', 'Te Atatu South'], ['City Centre Express', 'Parrs Park', 'Te Atatu South']],
  '070': [['City Centre', 'Westgate', 'Waimumu Road']],
  '079': [['City Centre', 'Sturges Road', 'Sunnyvale']],
  '080': [['City Centre', 'Westgate']],
  '081': [['City Centre', 'Westgate', 'Don Buck Rd']],
  '085': [['City Centre', 'Swanson']],
  '087': [['City Centre', 'Ranui']],
  '09X': [['City Centre', 'Sturges Rd Express'], ['City Centre Express', 'Sturges Rd']],
  '090': [['City Centre', 'Westgate', 'Massey East']],
  '091': [['City Centre', 'Westgate', 'Massey East and Lincoln Rd']],
  '092': [['City Centre', 'Hobsonville']],
  '093': [['Westgate', 'Whenuapai']],
  '095': [['City Centre', 'Whenuapai']],
  '097': [['City Centre', 'Ranui', 'Te Atatu South']],
  '102': [['New Lynn', 'Patiki Rd', 'Rosebank Rd']],
  '104': [['New Lynn Local']],
  '11X': [['City Centre', 'Henderson Express', 'Glendene'], ['City Centre Express', 'Henderson', 'Glendene']],
  '113': [['City Centre', 'Henderson', 'Kelston']],
  '115': [['City Centre', 'Henderson', 'Glendene']],
  '121': [['New Lynn', 'Te Atatu Peninsula']],
  '13X': [['City Centre', 'Ranui Express'], ['City Centre Express', 'Ranui']],
  '130': [['New Lynn', 'Takapuna']],
  '135': [['City Centre', 'Swanson', 'New Lynn']],
  '136': [['City Centre', 'Ranui', 'New Lynn'], ['City Centre', 'Ranui', 'Swanson']],
  '145': [['Henderson Hopper Via McLaren Park And Sturges Rd']],
  '149': [['New Lynn', 'Sturges Road'], ['New Lynn', 'Sturges Rd', 'Sunnyvale']],
  '15X': [['City Centre', 'Henderson Express', 'Glen Eden'], ['City Centre Express', 'Henderson', 'Glen Eden']],
  '153': [['City Centre', 'Henderson', 'Glen Eden'], ['City Centre', 'Henderson', 'Glen Eden And Rosier Rd']],
  '154': [['City Centre', 'Henderson', 'Glen Eden'], ['City Centre', 'Henderson', 'Glen Eden And Solar Rd']],
  '156': [['New Lynn', 'Forrest Hill Rd', 'Glen Eden']],
  '170': [['New Lynn', 'Titirangi South'], ['New Lynn', 'Titirangi South', 'Titirangi And French Bay']],
  '171': [['New Lynn', 'Laingholm']],
  '171X': [['City Centre', 'Laingholm Express'], ['City Centre Express', 'Laingholm']],
  '172': [['New Lynn', 'Glen Eden', 'Titirangi']],
  '172X': [['City Centre', 'Glen Eden Express', 'Titirangi'], ['City Centre Express', 'Glen Eden', 'Titirangi']],
  '186': [['New Lynn Loop']],
  '195': [['City Centre', 'New Lynn V Blockhouse Bay Rd And Green Bay(U)'], ['New Lynn', 'City Centre V GreenBay And Blockhouse Bay Rd (U)']],
  '209': [['City Centre', 'Titirangi', 'New North Rd And Green Bay (U)'], ['City Centre', 'Titirangi', 'Green Bay And New North Rd (U)']],

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
  '955': [['Midtown', 'Bayview']],
  '956': [['Mayoral Dr', 'Westgate Express', 'Greenhithe'], ['Mayoral Dr Express', 'Westgate', 'Greenhithe']],
  '957': [['Birkenhead Wharf', 'Albany Station', 'Highbury']],
  '958': [['Midtown', 'Constellation Station']],
  '960': [['Highbury', 'Northcote Point'], ['Highbury Shops', 'Northcote Point']],
  '962': [['Newmarket', 'Albany Station', 'Ponsonby']],
  '966': [['Newmarket', 'Beach Haven', 'Ponsonby']],
  '971': [['Auckland University', 'Chatswood']],
  '972': [['Auckland University', 'Beach Haven Wharf']],
  '973': [['Midtown', 'Beach Haven', 'Rangatira Rd'], ['Beach Haven', 'Midtown', 'Birkdale Rd And Highbury Bypass']],
  '974': [['Midtown', 'Beach Haven', 'Highbury Bypass'], ['Midtown', 'Beach Haven', 'Rangatira Rd And Highbury Bypass']],
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
  'N05': [['City Centre To Massey Via Te Atatu Peninsula']],
  'N13': [['City Centre To Te Atatu South Via New Lynn And Henderson']],
  'N24': [['City Centre To Mt Albert Vi Sandringham And BlockhouseBay']],
  'N26': [['City Centre To Lynfield Via Dominion Rd']],
  'N10': [['City To Otara Via Manukau Rd, Onehunga, Mangere, Papatoetoe']],
  'N11': [['City To Papakura Via Great South Rd']],
  'N50': [['Civic Centre To Howick Via Pakuranga']],
  'N62': [['City Centre To Orakei V Remuera GlenInnes And StHeliers']],
  'N83': [['Civic Centre To Takapuna And East Coast Bays']],
  'N97': [['Civic Centre To Birkenhead Via Beach Haven And Glenfield Rd']],

  '1': [['Matiatia Wharf', 'Onetangi']],
  '1a': [['Matiatia Wharf', 'Onetangi', 'Seaview Rd']],
  '2': [['Matiatia Wharf', 'Rocky Bay']],
  '3': [['Matiatia Wharf', 'Rocky Bay', 'Ostend & Onetangi'], ['Matiatia', 'Rocky Bay', 'Onetangi and Ostend']],
  '4': [['Matiatia Wharf', 'Onetangi Direct']],
} 

function cacheOperatorsAndShapes() {
  let todo = []
  let shapeCount = 0
  let shapesToCache = []
  for (var key in allLines) {
    todo.push(key)
  }

  let version = Object.keys(cache.versions)[0].split('_')[1]
  let getOperator = function(index) {
    if (index >= todo.length) {
      console.log('Completed Lookup of Agencies')
      return
    }
    // caches the operator
    let query = new azure.TableQuery()
      .select(['agency_id'])
      .top(1)
      .where('PartitionKey eq ? and route_short_name eq ?', version, todo[index])

    tableSvc.queryEntities('trips', query, null, function(error, result) {
      if(error) {
        console.warn(error)
      }
      // query was successful
      lineOperators[todo[index]] = result.entries[0].agency_id._
      getOperator(index + 1)
    })

    // caches the shape 
    line._getLine(todo[index], function(err, data) {
      if (err) {
        console.warn(err)
      }
      shapeCount++
      if (typeof(data[0]) !== 'undefined') {
        shapesToCache.push({shape_id: data[0].shape_id})
      }
      if (todo.length === shapeCount) {
        console.log('Collected List of Shapes To Cache')
        line.cacheShapes(shapesToCache)
      }
    })
  }
  getOperator(0)
}
// runs after initial cache get
cache.ready.push(cacheOperatorsAndShapes)

var line = {
  getLines: function(req, res) {
    res.send({
      friendlyNames: friendlyNames,
      groups: lineGroups,
      lines: allLines,
      operators: lineOperators
    })
  },

  getLine: function(req, res) {
    let lineId = req.params.line.trim()
    line._getLine(lineId, function(err, data) {
      if (err) {
        return res.status(500).send(err)
      }
      res.send(data)
    })
  },
  _getLine(lineId, cb) {
    let version = Object.keys(cache.versions)[0].split('_')[1]
    let query = new azure.TableQuery()
      .where('PartitionKey eq ? and route_short_name eq ?', version, lineId)
    tableSvc.queryEntities('routeShapes', query, null, function(err, result){
      if (err) {
        cb(err, null)
      }
      var versions = {}
      var results = []
      result.entries.forEach(function(route) {
        // checks to make it's the right route (the whole exception thing)
        if (line.exceptionCheck(route) === false){
          return
        }
        // make sure it's a current version of the geom
        if (typeof(cache.versions[route.RowKey._.split('-')[1]]) === 'undefined') {
          return
        }
        // make sure it's not already in the response
        if (typeof(versions[route.route_long_name._]) === 'undefined') {
          versions[route.route_long_name._] = true
        } else {
          return
        }

        let result = {
          route_id: route.RowKey._,
          route_long_name: route.route_long_name._,
          route_short_name: route.route_short_name._,
          shape_id: route.shape_id._,
          route_type: route.route_type._  
        }
        // if it's the best match, inserts at the front
        if (line.exceptionCheck(route, true) === true) {
          return results.unshift(result)
        }
        results.push(result)
      })
      cb(null, results)
    })
  },

  getShape: function(req, res) {
    let shape_id = req.params.shape_id
    tableSvc.retrieveEntity('meta', 'shapewkb', shape_id, function(err, result, response) {
      if (err) {
        line.getShapeFromAt([shape_id], function(wkb) {
          if (wkb.length < 1) {
            res.status(404).send({
              error: 'not found'
            })
          } else {
            res.send(wkb[0].the_geom)
          }
        })
        return
      }
     
      res.set('Content-Type', 'text/plain')
      blobSvc.getBlobToStream('shapewkb', shape_id, res, function(blobError, blobResult, blobResponse){
        if (blobError) {
          console.warn(blobError)
        }
        res.end()
        return
      })
    })
  },
  getShapeFromAt(arrayOfShapeId, cb) {
    if (arrayOfShapeId.length === 0) {
      return
    }

    var newOpts = JSON.parse(JSON.stringify(shapeWKBOptions))
    let shape_id = arrayOfShapeId[0]
    newOpts.url += shape_id
    request(newOpts, function(err, response, body) {
      if (err) {
        console.warn(err)
        console.log(`${shape_id} : Failed to get Shape`)
        return line.getShapeFromAt(arrayOfShapeId.slice(1), cb)
      }

      // if AT doesn't send back a shape
      let wkb = JSON.parse(body).response
      if (wkb.length < 1) {
        console.log(`${shape_id} : Shape not found!`)
        return nextItem()
      }

      let nextItem = function() {
        if (arrayOfShapeId.length === 1) {
          // only calls back the last shape, for immediate return
          if (cb) {
            cb(wkb)
          }
          return
        } else {
          return line.getShapeFromAt(arrayOfShapeId.slice(1), cb)
        }
      }

      blobSvc.createBlockBlobFromText('shapewkb', shape_id, wkb[0].the_geom, function(blobErr, blobResult, blobResponse) {
        if (blobErr) {
          console.warn(blobErr)
          return nextItem()
        }
        nextItem()

        // informs table storage that there is an item there
        var task = {
            PartitionKey: {'_': 'shapewkb'},
            RowKey: {'_': shape_id},
            date: {'_': new Date(), '$':'Edm.DateTime'}
          }
        tableSvc.insertOrReplaceEntity('meta', task, function (error) {
          if (error) {
            return console.warn(error)
          }
          console.log(`${shape_id} : Shape Saved from AT`)
        })
      })
    })  
  },

  exceptionCheck: function(route, bestMatchMode = false) {
    // blanket thing for no schools
    if (route.trip_headsign._ === 'Schools'){
      return false
    }
    if (typeof(allLines[route.route_short_name._]) === 'undefined') {
      return true
    }
    let retval = false
    let routes = allLines[route.route_short_name._].slice()

    // new mode that we only find the best match
    if (bestMatchMode) {
      routes = [routes[0]]
    }
    routes.forEach(function(variant) {
      if (variant.length === 1 && route.route_long_name._ === variant[0]) {
        retval = true
      // normal routes - from x to x
      } else if (variant.length === 2) {
        let splitName = route.route_long_name._.toLowerCase().split(' to ')
        if (variant[0].toLowerCase() == splitName[0] && variant[1].toLowerCase() == splitName[1]) {
          retval = true
        // reverses the order
        } else if (variant[1].toLowerCase() == splitName[0] && variant[0].toLowerCase() == splitName[1]  && !bestMatchMode) {
          retval = true
        }
      // handles via Flyover or whatever
      } else if (variant.length === 3) {
        let splitName = route.route_long_name._.toLowerCase().split(' to ')
        if (splitName.length > 1 && splitName[1].split(' via ')[1] === variant[2].toLowerCase()) {
          splitName[1] = splitName[1].split(' via ')[0]
          if (variant[0].toLowerCase() === splitName[0] && variant[1].toLowerCase() === splitName[1]) {
            retval = true
          // reverses the order
          } else if (variant[1].toLowerCase() === splitName[0] && variant[0].toLowerCase() === splitName[1] && !bestMatchMode) {
            retval = true
          }
        }
      }
    })
    return retval

  },

  getStopsFromTrip: function(req, res){
    var trip_id = req.params.trip_id
    // var pkey = trip_id.split('_').slice(-1)[0]
    var newOpts = JSON.parse(JSON.stringify(shapeWKBOptions))     
    newOpts.url = 'https://api.at.govt.nz/v2/gtfs/stops/tripId/' + trip_id
    request(newOpts, function(err, response, body){
      if (err) {
        console.log(err)
        res.status(500).send({
          error: err
        })
        return
      }
      res.send(JSON.parse(body).response.map(function(item){
        return {
          stop_id: item.stop_id,
          stop_name: item.stop_name,
          stop_lat: item.stop_lat,
          stop_lon: item.stop_lon,         
        }
      }))
    })  
  },
  getStopsFromShape: function(req, res) {
    let shape_id = req.params.shape_id
    let version = Object.keys(cache.versions)[0].split('_')[1]
    let query = new azure.TableQuery()
      .select('RowKey')
      .top(1)
      .where('PartitionKey eq ? and shape_id eq ?', version, shape_id)
    tableSvc.queryEntities('trips', query, null, function(err, result) {
      if (result.entries.length < 1) {
        return res.status(404).send({
          'error': 'shape not found'
        })
      }
      // pass it on to another controller with hacks
      let trip_id = result.entries[0].RowKey._
      req.params.trip_id =  trip_id
      line.getStopsFromTrip(req, res)
    })
  },

  cacheShapes: function(trips) {
    // makes a priority list
    let allShapes = {}
    trips.forEach(function(trip) {
      let shape = trip.shape_id
      if (shape in allShapes) {
        allShapes[shape] +=1
      } else {
        allShapes[shape] = 1
      }
    })
    // flattens to priority array
    let sorted = Object.keys(allShapes).sort(function(a, b) {
      return allShapes[b] - allShapes[a]
    }).map(function(sortedKey) {
      return sortedKey
    })
    let promises = []
    let requests = []
    sorted.forEach(function(shape) {
      promises.push(new Promise(function(resolve, reject) {
        tableSvc.retrieveEntity('meta', 'shapewkb', shape, function(err, result, response) {
          if (err) {
            requests.push(shape)
          }
          resolve()
        })
      }))
    })
    // after it sees if they exist, fire the cache
    Promise.all(promises).then(function() {
      line.getShapeFromAt(requests)
    })
  }
}

module.exports = line