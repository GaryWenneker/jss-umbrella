const crypto = require('crypto');
const fs = require('fs');

class utils {
    toBase64(text) {
        if (!text) return null;
        let buff = new Buffer(text);
        return buff.toString('base64');
    }
    fromBase64(text) {
        if (!text) return null;
        let buff = new Buffer(text, 'base64');
        return buff.toString('ascii');
    }
    getHashFromText(value) {
        if (!value) return '';
        let hash = crypto.createHash('sha1');
        hash.setEncoding('hex');
        hash.write(value);
        hash.end();
        return hash.read();
    };
    getHashFromFile(path) {
        let fileContent;
        return new Promise((resolve, reject) => {
            try {
                fileContent = fs.readFileSync(path, {
                    encoding: 'base64'
                });
            } catch (e) {
                reject('FNF');
            }
            resolve(fileContent);
        });
    };
}

module.exports = utils;