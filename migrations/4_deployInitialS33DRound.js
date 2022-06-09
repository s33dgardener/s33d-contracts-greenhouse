var S33DS = artifacts.require('S33DS.sol');
var InitialS33D = artifacts.require('InitialS33DRound.sol');

module.exports = async function (deployer, network) {
  console.log('S33DS address: ', S33DS.address);
  let addr = await web3.eth.getAccounts();
  console.log('Addr[0]:', addr[0]);
  if (network == 'bsc') {
    var usdtContract = '0x55d398326f99059fF775485246999027B3197955'; // bsc mainnet usdt
  } else if (network == '') {
    var usdtContract = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; //testnet usdt
  } else {
    var usdtContract = '0x0000000000000000000000000000000000000000';
  }
  console.log('USDT contract: ', usdtContract);
  await deployer.deploy(InitialS33D, S33DS.address, usdtContract, web3.utils.toWei('0.1', 'ether'), web3.utils.toWei('100000', 'ether'));
};
