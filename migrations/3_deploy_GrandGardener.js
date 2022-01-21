var S33DS = artifacts.require("S33DS.sol");
var GrandGardener = artifacts.require("GrandGardener.sol");

module.exports = async function(deployer) {
  console.log('S33DS address: ', S33DS.address);
  let addr = await web3.eth.getAccounts();
  console.log('Addr[0]:', addr[0])
  await deployer.deploy(GrandGardener, S33DS.address, addr[0], 33, 16060606);
  let s33d = await S33DS.deployed();
  let gardener = await GrandGardener.deployed();
  await s33d.mint(addr[0], web3.utils.toWei('33333333', 'ether'));
  await s33d.transferOwnership(gardener.address);
  await gardener.updateMultiplier(web3.utils.toWei('0.1', 'ether')); // Set emission to 3.3 S33D per block
};