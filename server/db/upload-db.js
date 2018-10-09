const log = require('../logger.js');

class UploadDb {
  async upload(path) {
    const { local } = global.config;
    if (local) {
      await this.uploadLocal(path);
    } else {
      const AWS = require('aws-sdk');
      this.s3 = new AWS.S3({});
      await this.uploadToS3(path);
    }
  }

  async uploadToS3(path) {
    log('uploading to s3');
  }

  async uploadLocal(path) {
    log('uploading to local');
  }
}

module.exports = UploadDb;
