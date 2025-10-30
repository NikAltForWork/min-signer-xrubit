const path = require('path');
const fs = require('fs/promises');
const  crypto  = require('node:crypto');
require('dotenv').config();

const key = process.env.APP_KEY;
const algorithm = process.env.ALGORITHM;
const iv_length = parseInt(process.env.IV_LENGTH);

class KeyService
{


  async storeEncrypt(network, currency, type, xpub, mnemonic) {
  try {
    const storage_path = path.join('storage', network, currency, type);
    const file_path = path.join(storage_path, 'key_encrypted.json');

    const iv = crypto.randomBytes(iv_length);

    const dataToEncrypt = JSON.stringify({
      xpub: xpub,
      mnemonic: mnemonic
    });

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    const encryptedData = {
      iv: iv.toString('hex'),
      data: encrypted,
      tag: authTag.toString('hex'),
      algorithm: algorithm,
      timestamp: new Date().toISOString()
    };

    await fs.mkdir(storage_path, { recursive: true });
    await fs.writeFile(file_path, JSON.stringify(encryptedData, null, 2));

    return true;

    } catch(error) {
    console.error('Encryption error:', error.message);
    throw error;
    }
  }
  async decryptKey(network, currency, type) {
  try {
    const file_path = path.join('storage', network, currency, type, 'key_encrypted.json');

    const encryptedData = JSON.parse(await fs.readFile(file_path, 'utf8'));

    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const data = await JSON.parse(decrypted);

    return data.mnemonic;

  } catch(error) {
    console.error('Decryption error:', error.message);
    throw error;
  }
}
  async store(network, currency, type, xpub, mnemonic)
  {
    try {
      const storage_path = path.join('storage', network, currency, type);
      const file_path = path.join(storage_path, 'keys.json');

      const data = {
        xpub: xpub,
        mnemonic: mnemonic,
      }
      const data_json = JSON.stringify(data, null, 2);

      await fs.mkdir(storage_path, {recursive: true});

      await fs.writeFile(file_path, data_json);

      return true;
    } catch(error) {
      console.log(error.message);
      return false;
    }
  }

  async getKey(network, currency, type)
  {
    try {
      const storage_path = path.join('storage', network, currency, type);
      const file_path = path.join(storage_path, 'keys.json');

      const file = await fs.readFile(file_path);

      const data = await JSON.parse(file, null, 2);

      return data.mnemonic;

    } catch(error) {
      console.log(error);
      return false;
    }
  }

  async isStored(network, currency, type)
  {
    try {
      const storage_path = path.join('storage', network, currency, type);
      const file_path = path.join(storage_path, 'keys.json');

      const file = await fs.readFile(file_path);
      if (file) {
        return true;
        } else {
          return false;
        }
    } catch(error) {
      console.log(error.message);
    }
  }

  async isEncrypted(network, currency, type)
  {
    try {
      const storage_path = path.join('storage', network, currency, type);
      const file_path = path.join(storage_path, 'key_encrypted.json');

      const file = await fs.readFile(file_path);
      if (file) {
        return true;
        } else {
          return false;
        }
    } catch(error) {
      console.log(error.message);
    }
  }

}

module.exports = KeyService;
