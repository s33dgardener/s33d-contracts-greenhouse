const { expectRevert, time, BN } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const S33DS = artifacts.require('S33DS');
const GrandGardener = artifacts.require('GrandGardener');
const MockBEP20 = artifacts.require('libs/MockBEP20');

require('chai').use(require('chai-bn')(BN)).should();

contract('GrandGardener', ([alice, bob, carol, dev, burner, furnace, minter]) => {
  // describe('S33D Contract Unit Test', function () {
  //   var s33DGGTest;
  //   beforeEach(async () => {
  //     this.s33d = await S33DS.new({ from: minter });
  //     // Create liquidity pools
  //     this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', {
  //       from: minter,
  //     });
  //     this.lp2 = await MockBEP20.new('LPToken', 'LP2', '1000000', {
  //       from: minter,
  //     });
  //     this.lp3 = await MockBEP20.new('LPToken', 'LP3', '1000000', {
  //       from: minter,
  //     });
  //   });
  //   describe('## Creation ##', function () {
  //     it('S33D initialisation', function () {
  // 			console.log('S33DS:', this.s33d);
  // 		});
  //   });
  // });

  beforeEach(async () => {
    this.s33d = await S33DS.new({ from: minter });
    // Create liquidity pools
    this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', {
      from: minter,
    });
    this.lp2 = await MockBEP20.new('LPToken', 'LP2', '1000000', {
      from: minter,
    });
    this.lp3 = await MockBEP20.new('LPToken', 'LP3', '1000000', {
      from: minter,
    });
    // Mint some S33D to Carol
    const initialSupply = new BN(web3.utils.toWei('300000', 'ether'));
    await this.s33d.mint(carol, initialSupply, { from: minter });
    // Create new GrandGardener
    this.gardener = await GrandGardener.new(this.s33d.address, dev, '33', '111', { from: minter });
    // Transfer S33DS to GrandGardener
    await this.s33d.transferOwnership(this.gardener.address, {
      from: minter,
    });
    // Set multiplier
    var multiplier = new BN(web3.utils.toWei('1', 'ether'));
    await this.gardener.updateMultiplier(multiplier, { from: minter });
    // Deposit LP tokens to Alice
    await this.lp1.transfer(alice, '2000', { from: minter });
    await this.lp2.transfer(alice, '2000', { from: minter });
    await this.lp3.transfer(alice, '2000', { from: minter });
    // Deposit LP tokens to Bob
    await this.lp1.transfer(bob, '2000', { from: minter });
    await this.lp2.transfer(bob, '2000', { from: minter });
    await this.lp3.transfer(bob, '2000', { from: minter });
  });
  it('S33D Minting', async () => {
    var carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    expect(carolWalletS33DBal).to.be.bignumber.equal(web3.utils.toWei('300000', 'ether'));
  });
  it('Transfer S33DS ownership to GrandGardener', async () => {
    owner = await this.s33d.owner();
    expect(owner).to.equal(this.gardener.address);
  });
  it('Staking S33D into GrandGardener', async () => {
    // Pre-approval
    await this.s33d.approve(this.gardener.address, web3.utils.toWei('100000', 'ether'), { from: carol });

    // Stake S33D
    var stakeAmount = new BN(web3.utils.toWei('100000', 'ether'));
    await this.gardener.enterStaking(stakeAmount, {
      from: carol,
    });

    // Check balances and staked amount
    var carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    var grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    var userS33DStaked = await this.gardener.userInfo(0, carol);
    expect(carolWalletS33DBal).to.be.bignumber.equal(web3.utils.toWei('200000', 'ether'));
    expect(grandGardenerS33DBal).to.be.bignumber.equal(web3.utils.toWei('100000', 'ether'));
    expect(userS33DStaked[0]).to.be.bignumber.equal(web3.utils.toWei('100000', 'ether'));

    // Check balances after some blocks before reward starts
    await time.advanceBlockTo('50');
    await this.gardener.updatePool(0);
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    userS33DStaked = await this.gardener.userInfo(0, carol);
    expect(carolWalletS33DBal).to.be.bignumber.equal(web3.utils.toWei('200000', 'ether'));
    expect(grandGardenerS33DBal).to.be.bignumber.equal(web3.utils.toWei('100000', 'ether'));
    expect(userS33DStaked[0]).to.be.bignumber.equal(web3.utils.toWei('100000', 'ether'));

    // Progress to S33D minting block and update pool
    await time.advanceBlockTo('111');
    await this.gardener.updatePool(0);

    // Verify pool updated
    var pool = await this.gardener.poolInfo(0);
    console.log('Last reward block: ', pool.lastRewardBlock.toString());
    console.log('accS33DPerShare: ', pool.accS33DPerShare.toString());

    // Verify rewards issued to GrandGardener
    grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    console.log('GrandGardenerS33DBal after 1st block: ', web3.utils.fromWei(grandGardenerS33DBal.toString(), 'ether'));
    expect(grandGardenerS33DBal).to.be.bignumber.equal(web3.utils.toWei('100033', 'ether'));

    // Verify dev allocation issued
    var devWalletBalance = new BN(await this.s33d.balanceOf(dev));
    console.log('devWalletBalance:', web3.utils.fromWei(devWalletBalance.toString(), 'ether'));
    expect(devWalletBalance).to.be.bignumber.equal(web3.utils.toWei('1', 'ether'));

    // Verify total supply for S33D increased
    var s33dTotalSupply = new BN(await this.s33d.totalSupply());
    console.log('s33dTotalSupply:', web3.utils.fromWei(s33dTotalSupply.toString(), 'ether'));
    expect(s33dTotalSupply).to.be.bignumber.equal(web3.utils.toWei('300034', 'ether'));

    // Verify Carol's balance unchanged
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    expect(carolWalletS33DBal).to.be.bignumber.equal(web3.utils.toWei('200000', 'ether'));

    // What is owed to Carol by GrandGardener for staking
    var pendingS33DReward = new BN(await this.gardener.pendingS33D(0, carol, { from: carol }));
    console.log('Pending S33D to Carol:', web3.utils.fromWei(pendingS33DReward.toString(), 'ether'));
    expect(pendingS33DReward).to.be.bignumber.equal(web3.utils.toWei('33', 'ether'), web3.utils.toWei('1', 'gwei'));
  });
  it('Unstaking all S33D from GrandGardener', async () => {
    var currentBlock = await time.latestBlock();
    console.log('Current block: ', currentBlock.toString());

    // Carol opening balance
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    console.log('Carol opening balance: ', web3.utils.fromWei(carolWalletS33DBal, 'ether'));

    // Pre-approval
    await this.s33d.approve(this.gardener.address, web3.utils.toWei('100000', 'ether'), { from: carol });

    // Stake S33D
    var stakeAmount = new BN(web3.utils.toWei('100000', 'ether'));
    await this.gardener.enterStaking(stakeAmount, {
      from: carol,
    });
    // Carol balance after staking
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    console.log('Carol remain balance after stake: ', web3.utils.fromWei(carolWalletS33DBal, 'ether'));

    // Verify balances after staking
    grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    console.log('Balance in GrandGardener before unstake:', web3.utils.fromWei(grandGardenerS33DBal.toString(), 'ether'));
    userS33DStaked = await this.gardener.userInfo(0, carol);
    console.log('userS33DStaked amount:', web3.utils.fromWei(userS33DStaked.amount.toString(), 'ether'));
    console.log('userS33DStaked rewardDebt:', userS33DStaked.rewardDebt.toString());
    poolInfo = await this.gardener.poolInfo(0);

    // Unstake entire balance
    await this.gardener.leaveStaking(userS33DStaked.amount, { from: carol });
    grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    console.log('Balance in GrandGardener after complete unstake:', grandGardenerS33DBal.toString());
    expect(grandGardenerS33DBal).to.be.bignumber.equal('0');
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    console.log('Carol balance after complete unstake:', web3.utils.fromWei(carolWalletS33DBal, 'ether'));
    expect(carolWalletS33DBal).to.be.bignumber.equal(web3.utils.toWei('300033', 'ether'));
  });
  it('Unstaking partial S33D from GrandGardener', async () => {
    var currentBlock = await time.latestBlock();
    console.log('Current block: ', currentBlock.toString());

    // Carol opening balance
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    console.log('Carol opening balance: ', web3.utils.fromWei(carolWalletS33DBal, 'ether'));

    // Pre-approval
    await this.s33d.approve(this.gardener.address, web3.utils.toWei('100000', 'ether'), { from: carol });

    // Stake S33D
    var stakeAmount = new BN(web3.utils.toWei('100000', 'ether'));
    await this.gardener.enterStaking(stakeAmount, {
      from: carol,
    });
    // Carol balance after staking
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    console.log('Carol remain balance after stake: ', web3.utils.fromWei(carolWalletS33DBal, 'ether'));

    // Verify balances after staking
    grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    console.log('Balance in GrandGardener before unstake:', web3.utils.fromWei(grandGardenerS33DBal.toString(), 'ether'));
    userS33DStaked = await this.gardener.userInfo(0, carol);
    console.log('userS33DStaked amount:', web3.utils.fromWei(userS33DStaked.amount.toString(), 'ether'));
    console.log('userS33DStaked rewardDebt:', userS33DStaked.rewardDebt.toString());
    poolInfo = await this.gardener.poolInfo(0);

    // Verify pool info
    var pool = await this.gardener.poolInfo(0);
    console.log('Last reward block: ', pool.lastRewardBlock.toString());
    console.log('accS33DPerShare: ', pool.accS33DPerShare.toString());

    // Unstake half balance
    var unstakeAmount = web3.utils.toWei('50000', 'ether');
    console.log('Unstake amount: ', web3.utils.fromWei(unstakeAmount.toString(), 'ether'));
    await this.gardener.leaveStaking(unstakeAmount, { from: carol });
    grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    console.log('Balance in GrandGardener after complete unstake:', web3.utils.fromWei(grandGardenerS33DBal, 'ether'));
    expect(grandGardenerS33DBal).to.be.bignumber.equal(web3.utils.toWei('50000', 'ether'));
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    console.log('Carol balance after complete unstake:', web3.utils.fromWei(carolWalletS33DBal, 'ether'));
    expect(carolWalletS33DBal).to.be.bignumber.equal(web3.utils.toWei('250033', 'ether'));

    // Verify pool info after unstake
    await this.gardener.updatePool(0);
    var pool = await this.gardener.poolInfo(0);
    console.log('Last reward block after complete unstake: ', pool.lastRewardBlock.toString());
    console.log('accS33DPerShare after complete unstake: ', pool.accS33DPerShare.toString());

    // Pre-approval for additional restake
    await this.s33d.approve(this.gardener.address, web3.utils.toWei('150000', 'ether'), { from: carol });

    // Restake more into the GrandGardener
    var stakeAmount = new BN(web3.utils.toWei('150000', 'ether'));
    await this.gardener.enterStaking(stakeAmount, {
      from: carol,
    });

    // Verify pool info after restake
    var pool = await this.gardener.poolInfo(0);
    console.log('Last reward block after restake: ', pool.lastRewardBlock.toString());
    console.log('accS33DPerShare after restake: ', pool.accS33DPerShare.toString());

    // Carol balance after restaking
    carolWalletS33DBal = new BN(await this.s33d.balanceOf(carol));
    console.log('Carol remain balance after restake: ', web3.utils.fromWei(carolWalletS33DBal, 'ether'));
  });
  // it('real case', async () => {
  //   await this.gardener.add('2000', this.lp1.address, true, { from: minter });
  //   await this.gardener.add('1000', this.lp2.address, true, { from: minter });
  //   await this.gardener.add('500', this.lp3.address, true, { from: minter });
  //   await this.gardener.add('500', this.lp3.address, true, { from: minter });
  //   await this.gardener.add('500', this.lp3.address, true, { from: minter });
  //   await this.gardener.add('500', this.lp3.address, true, { from: minter });
  //   await this.gardener.add('500', this.lp3.address, true, { from: minter });
  //   await this.gardener.add('100', this.lp3.address, true, { from: minter });
  //   await this.gardener.add('100', this.lp3.address, true, { from: minter });
  //   assert.equal((await this.gardener.poolLength()).toString(), "10");

  //   await time.advanceBlockTo('170');
  //   await this.lp1.approve(this.gardener.address, '1000', { from: alice });
  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '0');
  //   await this.gardener.deposit(1, '20', { from: alice });
  //   await this.gardener.withdraw(1, '20', { from: alice });
  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '263');

  //   await this.s33d.approve(this.gardener.address, '1000', { from: alice });
  //   await this.gardener.enterStaking('20', { from: alice });
  //   await this.gardener.enterStaking('0', { from: alice });
  //   await this.gardener.enterStaking('0', { from: alice });
  //   await this.gardener.enterStaking('0', { from: alice });
  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '993');
  //   // assert.equal((await this.gardener.getPoolPoint(0, { from: minter })).toString(), '1900');
  // })

  // it('deposit/withdraw', async () => {
  //   await this.gardener.add('1000', this.lp1.address, true, { from: minter });
  //   await this.gardener.add('1000', this.lp2.address, true, { from: minter });
  //   await this.gardener.add('1000', this.lp3.address, true, { from: minter });

  //   await this.lp1.approve(this.gardener.address, '100', { from: alice });
  //   await this.gardener.deposit(1, '20', { from: alice });
  //   await this.gardener.deposit(1, '0', { from: alice });
  //   await this.gardener.deposit(1, '40', { from: alice });
  //   await this.gardener.deposit(1, '0', { from: alice });
  //   assert.equal((await this.lp1.balanceOf(alice)).toString(), '1940');
  //   await this.gardener.withdraw(1, '10', { from: alice });
  //   assert.equal((await this.lp1.balanceOf(alice)).toString(), '1950');
  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '999');
  //   assert.equal((await this.s33d.balanceOf(dev)).toString(), '100');

  //   await this.lp1.approve(this.gardener.address, '100', { from: bob });
  //   assert.equal((await this.lp1.balanceOf(bob)).toString(), '2000');
  //   await this.gardener.deposit(1, '50', { from: bob });
  //   assert.equal((await this.lp1.balanceOf(bob)).toString(), '1950');
  //   await this.gardener.deposit(1, '0', { from: bob });
  //   assert.equal((await this.s33d.balanceOf(bob)).toString(), '125');
  //   await this.gardener.emergencyWithdraw(1, { from: bob });
  //   assert.equal((await this.lp1.balanceOf(bob)).toString(), '2000');
  // })

  // it('staking/unstaking', async () => {
  //   await this.gardener.add('1000', this.lp1.address, true, { from: minter });
  //   await this.gardener.add('1000', this.lp2.address, true, { from: minter });
  //   await this.gardener.add('1000', this.lp3.address, true, { from: minter });

  //   await this.lp1.approve(this.gardener.address, '10', { from: alice });
  //   await this.gardener.deposit(1, '2', { from: alice }); //0
  //   await this.gardener.withdraw(1, '2', { from: alice }); //1

  //   await this.s33d.approve(this.gardener.address, '250', { from: alice });
  //   await this.gardener.enterStaking('240', { from: alice }); //3
  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '10');
  //   await this.gardener.enterStaking('10', { from: alice }); //4
  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '249');
  //   await this.gardener.leaveStaking(250);
  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '749');

  // });

  // it('update multiplier', async () => {
  //   await this.gardener.add('1000', this.lp1.address, true, { from: minter });
  //   await this.gardener.add('1000', this.lp2.address, true, { from: minter });
  //   await this.gardener.add('1000', this.lp3.address, true, { from: minter });

  //   await this.lp1.approve(this.gardener.address, '100', { from: alice });
  //   await this.lp1.approve(this.gardener.address, '100', { from: bob });
  //   await this.gardener.deposit(1, '100', { from: alice });
  //   await this.gardener.deposit(1, '100', { from: bob });
  //   await this.gardener.deposit(1, '0', { from: alice });
  //   await this.gardener.deposit(1, '0', { from: bob });

  //   await this.s33d.approve(this.gardener.address, '100', { from: alice });
  //   await this.s33d.approve(this.gardener.address, '100', { from: bob });
  //   await this.gardener.enterStaking('50', { from: alice });
  //   await this.gardener.enterStaking('100', { from: bob });

  //   await this.gardener.updateMultiplier('0', { from: minter });

  //   await this.gardener.enterStaking('0', { from: alice });
  //   await this.gardener.enterStaking('0', { from: bob });
  //   await this.gardener.deposit(1, '0', { from: alice });
  //   await this.gardener.deposit(1, '0', { from: bob });

  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '700');
  //   assert.equal((await this.s33d.balanceOf(bob)).toString(), '150');

  //   await time.advanceBlockTo('265');

  //   await this.gardener.enterStaking('0', { from: alice });
  //   await this.gardener.enterStaking('0', { from: bob });
  //   await this.gardener.deposit(1, '0', { from: alice });
  //   await this.gardener.deposit(1, '0', { from: bob });

  //   assert.equal((await this.s33d.balanceOf(alice)).toString(), '700');
  //   assert.equal((await this.s33d.balanceOf(bob)).toString(), '150');

  //   await this.gardener.leaveStaking('50', { from: alice });
  //   await this.gardener.leaveStaking('100', { from: bob });
  //   await this.gardener.withdraw(1, '100', { from: alice });
  //   await this.gardener.withdraw(1, '100', { from: bob });

  // });

  // it('should allow dev and only dev to update dev', async () => {
  //     assert.equal((await this.gardener.devaddr()).valueOf(), dev);
  //     await expectRevert(this.gardener.dev(bob, { from: bob }), 'dev: wut?');
  //     await this.gardener.dev(bob, { from: dev });
  //     assert.equal((await this.gardener.devaddr()).valueOf(), bob);
  //     await this.gardener.dev(alice, { from: bob });
  //     assert.equal((await this.gardener.devaddr()).valueOf(), alice);
  // })

  // it('safeS33DTransfer', async () => {
  //   assert.equal(
  //     (await this.s33d.balanceOf(this.s33d.address)).toString(),
  //     '0'
  //   );
  //   await this.s33d.mint(this.s33d.address, 1000, { from: minter });
  //   await this.s33d.safeS33DTransfer(bob, 200, { from: minter });
  //   assert.equal((await this.s33d.balanceOf(bob)).toString(), '200');
  //   assert.equal(
  //     (await this.s33d.balanceOf(this.s33d.address)).toString(),
  //     '800'
  //   );
  //   await this.s33d.safeS33DTransfer(bob, 2000, { from: minter });
  //   assert.equal((await this.s33d.balanceOf(bob)).toString(), '1000');
  // });
});
