var GrandGardener = artifacts.require("GrandGardener.sol")

module.exports = async function(deployer) {
  await deployer.deploy(GrandGardener);
};