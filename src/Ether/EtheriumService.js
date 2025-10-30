const EtherBasicService = require('./EtherBasicService.js');
class EtheriumService extends EtherBasicService
{
  constructor(mnemonic) {
    super(mnemonic)
  }

  async createAndSignTransfer(params)
  {
    const signer = this.wallet.connect(this.provider);
    const { to, amount } = params;
    const tx = await signer.sendTransaction({
            to: to,
            amount: amount,
        });
    const receipt = await tx.wait();
    return receipt;
  }
}

module.exports = EtheriumService;
