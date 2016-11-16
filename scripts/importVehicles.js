let fs = require('fs')
let azure = require('azure-storage')

console.log('connecting to azure')
let tableSvc = azure.createTableService()

tableSvc.createTableIfNotExists('vehicleList', function(err) {
  if (err) throw err
  console.log('created table vehicleList')
  readFile()
})

let vehicleList = {}
let readFile = function() {
  let fileName = process.argv.slice(-1)[0]
  fs.readFile(fileName, function(err, data) {
    if (err) throw err
    data.toString().split('\n').forEach(function(vehicle) {
      let data = vehicle.split(',')
      if (transformCompanies(data[0]) === false) {
        console.log(data[0], 'needs transform')
        return
      }
      let key = transformCompanies(data[0])
      vehicleList[key + data[2]] = {
        key: key,
        id: data[2],
        model: transformModels(data[3]),
        reg: data[4].replace('\r', '')
      }
    })
    uploadData()
  })
}
let uploadData = function() {
  console.log('uploading now')
  let arrayOfEntityArrays = {}
  let arrayOfEntityCounts = {}
  for (let vkey in vehicleList) {
    let key = vehicleList[vkey].key
    if (typeof(arrayOfEntityArrays[key]) === 'undefined') {
      arrayOfEntityArrays[key] = []
      arrayOfEntityCounts[key] = 0
    }
    let b = arrayOfEntityArrays[key]
    let c = arrayOfEntityCounts[key]
    b[c] = b[c] || new azure.TableBatch()
    if (b[c].operations.length > 99) {
      // have to update both the copy, and the pointer
      arrayOfEntityCounts[key]++
      c++ 
      // then we can create a new batch
      b[c] = b[c] || new azure.TableBatch()
    }
    b[c].insertOrReplaceEntity({
      PartitionKey: {'_': key},
      RowKey: {'_': vehicleList[vkey]['id'].toString()},
      model: {'_': vehicleList[vkey]['model']},
      reg: {'_': vehicleList[vkey]['reg']}
    })
  }
  var batchUpload = function(name, batch, n) {
    try {
      if (n < batch.length) {
        console.log(`uploading vehicles_${name} batch ${n+1}/${batch.length}`)
        tableSvc.executeBatch('vehicleList', batch[n], function (error, result, response) {
          if(!error) {
            batchUpload(name, batch, n+1)
          } else {
            if (error.code === 'ETIMEDOUT') {
              console.log('ETIMEDOUT... retrying')
              batchUpload(name, batch, n)
            } else {
              console.log(error)
            }
          }
        })
      }
    } catch(err) {
      console.log(err)
    }
  }
  for (var key in arrayOfEntityArrays) {
    batchUpload(key, arrayOfEntityArrays[key], 0)
  }
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