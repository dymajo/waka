const azure = require('azure-storage')
const testcreds = ['devstoreaccount1', 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==', 'http://127.0.0.1:10000/devstoreaccount1']

class Storage {
  constructor(props) {
    this.backing = props.backing
    if (this.backing === 'azure') {
      const creds = props.local ? testcreds : []
      this.blobSvc = azure.createBlobService(...creds)
    }
  }
  createContainer(container, cb) {
    if (this.backing === 'azure') {
      this.blobSvc.createContainerIfNotExists(container, function(error) {
        if (error) {
          console.error(error)
          throw error
        }
        cb()
      })
    }
  }
  downloadStream(container, file, stream, callback) {
    if (this.backing === 'azure') {
      return this.blobSvc.getBlobToStream(container, file, stream, callback)
    }
  }
  uploadFile(container, file, path, callback) {
    if (this.backing === 'azure') {
      return this.blobSvc.createBlockBlobFromLocalFile(container, file, path, callback)
    } 
  }
}
module.exports = Storage