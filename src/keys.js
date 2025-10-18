const path = require('path');
const fs = require('fs/promises');

class KeyService
{
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
      console.log(error);
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
}

module.exports = KeyService;
