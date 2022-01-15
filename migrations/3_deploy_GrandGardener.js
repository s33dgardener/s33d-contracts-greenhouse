var S33DS = artifacts.require("S33DS.sol");
var GrandGardener = artifacts.require("GrandGardener.sol");

module.exports = async function(deployer) {
  console.log('S33DS address: ', S33DS.address);
  let addr = await web3.eth.getAccounts();
  console.log('Addr[0]:', addr[0])
  await deployer.deploy(GrandGardener, S33DS.address, addr[0], 33, 15803333);
};