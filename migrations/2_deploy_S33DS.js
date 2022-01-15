var S33DS = artifacts.require("S33DS.sol");

module.exports = async function(deployer) {
  await deployer.deploy(S33DS);
};