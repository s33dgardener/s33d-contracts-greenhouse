var S33DS = artifacts.require("S33DS.sol");
// var GrandGardener = artifacts.require("GrandGardener.sol");
// var LotteryRewardsPool = artifacts.require("LotteryRewardPool.sol");

module.exports = async function(deployer) {
  await deployer.deploy(S33DS);
  // let addr = await web3.eth.getAccounts();
  // await deployer.deploy(GrandGardener, S33DS.address, addr[0], 33, 1000);
};