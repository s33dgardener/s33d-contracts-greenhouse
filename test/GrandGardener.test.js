const { expectRevert, time, BN } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
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
    this.lp4 = await MockBEP20.new('LPToken', 'LP4', '1000000', {
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
    grandGardenerS33DBal = new BN(await this.s33d.balanceOf(this.gardener.address));
    console.log('Balance in GrandGardener after restake:', web3.utils.fromWei(grandGardenerS33DBal.toString(), 'ether'));
    userS33DStaked = await this.gardener.userInfo(0, carol);
    console.log('userS33DStaked amount after restake:', web3.utils.fromWei(userS33DStaked.amount.toString(), 'ether'));
    console.log('userS33DStaked rewardDebt after restake:', web3.utils.fromWei(userS33DStaked.rewardDebt, 'ether'));

    // Carol pending S33D rewards
    await this.gardener.updatePool(0);
    var pendingS33DReward = new BN(await this.gardener.pendingS33D(0, carol, { from: carol }));
    console.log('Pending S33D to Carol:', web3.utils.fromWei(pendingS33DReward.toString(), 'ether'));
    expect(pendingS33DReward).to.be.bignumber.closeTo(web3.utils.toWei('33', 'ether'), web3.utils.toWei('10', 'finney'));

    // Speed through some blocks
    await time.advanceBlockTo('349');
    var currentBlock = await time.latestBlock();
    console.log('Current block: ', currentBlock.toString());
    await this.gardener.updatePool(0);
    var pendingS33DReward = new BN(await this.gardener.pendingS33D(0, carol, { from: carol }));
    console.log('Pending S33D to Carol @', currentBlock.toString(), ':', web3.utils.fromWei(pendingS33DReward.toString(), 'ether'));

    var pool = await this.gardener.poolInfo(0);
    console.log('Last reward block after restake: ', pool.lastRewardBlock.toString());
    console.log('accS33DPerShare after restake: ', pool.accS33DPerShare.toString());
  });
  it('Add new pools', async () => {
    await this.gardener.add('1000', this.lp1.address, true, { from: minter });
    // Check allocation point breakdown after first add
    totalAllocPoint = await this.gardener.totalAllocPoint();
    console.log('Total allocation after allocating another 1000:', totalAllocPoint.toString());
    expect(totalAllocPoint).is.bignumber.equal('1250');

    await this.gardener.add('1000', this.lp2.address, true, { from: minter });
    // Check allocation point breakdown after second add
    totalAllocPoint = await this.gardener.totalAllocPoint();
    console.log('Total allocation after allocating another 1000:', totalAllocPoint.toString());
    expect(totalAllocPoint).is.bignumber.equal('2500');

    await this.gardener.add('400', this.lp3.address, true, { from: minter });
    // Check allocation point breakdown after third add
    totalAllocPoint = await this.gardener.totalAllocPoint();
    console.log('Total allocation after allocating another 400:', totalAllocPoint.toString());
    expect(totalAllocPoint).is.bignumber.equal('3000');

    await this.gardener.add('1600', this.lp4.address, true, { from: minter });
    // Check allocation point breakdown after fourth add
    totalAllocPoint = await this.gardener.totalAllocPoint();
    console.log('Total allocation after allocating another 1600:', totalAllocPoint.toString());
    expect(totalAllocPoint).is.bignumber.equal('5000');

    // Check the total number of pools after adding
    poolLength = await this.gardener.poolLength();
    expect(poolLength).is.bignumber.equal('5');
  });
  it('Adding lpToken to S33D staking pool', async () => {
    await this.gardener.add('1000', this.lp1.address, true, { from: minter });
    await this.gardener.add('1000', this.lp2.address, true, { from: minter });
    await this.gardener.add('400', this.lp3.address, true, { from: minter });
    await this.gardener.add('1600', this.lp4.address, true, { from: minter });

    // Advancing blocks
    var currentBlock = await time.latestBlock();
    console.log('Current block: ', currentBlock.toString());

    // Approve spending by GrandGardener
    await this.lp1.approve(this.gardener.address, '1000', { from: alice });
    aliceS33DBalance = await this.s33d.balanceOf(alice);
    expect(aliceS33DBalance).is.bignumber.equal('0');

    // Deposit and withdraw from the staking pool
    await this.gardener.deposit(1, '1000', { from: alice });
    await this.gardener.withdraw(1, '1000', { from: alice });
    aliceS33DBalance = await this.s33d.balanceOf(alice);
    expect(aliceS33DBalance).is.bignumber.equal(web3.utils.toWei('6.6', 'ether'));

    // Approve spending by GrandGardener
    await this.s33d.approve(this.gardener.address, web3.utils.toWei('1000', 'ether'), { from: carol });
    await this.lp1.approve(this.gardener.address, '1000', { from: alice });
    await this.lp2.approve(this.gardener.address, '1000', { from: bob });
    await this.lp3.approve(this.gardener.address, '1000', { from: bob });
    aliceS33DBalance = await this.s33d.balanceOf(alice);
    bobS33DBalance = await this.s33d.balanceOf(bob);
    expect(aliceS33DBalance).is.bignumber.equal(web3.utils.toWei('6.6', 'ether'));
    expect(bobS33DBalance).is.bignumber.equal('0');

    // Deposit into multiple staking pools
    await this.gardener.enterStaking(web3.utils.toWei('1000', 'ether'), { from: carol });
    await this.gardener.deposit(1, '1000', { from: alice });
    await this.gardener.deposit(2, '1000', { from: bob });
    await this.gardener.deposit(3, '1000', { from: bob });

    // Check staked amount is correct
    var user0 = await this.gardener.userInfo(0, carol);
    console.log('Carol balance in pool0: ', web3.utils.fromWei(user0.amount, 'ether'));
    expect(user0.amount).is.bignumber.equal(web3.utils.toWei('1000', 'ether'));
    var user1 = await this.gardener.userInfo(1, alice);
    console.log('Alice balance in pool1: ', user1.amount.toString());
    expect(user1.amount).is.bignumber.equal('1000');
    var user2 = await this.gardener.userInfo(2, bob);
    console.log('Bob balance in pool0: ', user2.amount.toString());
    expect(user2.amount).is.bignumber.equal('1000');
    var user3 = await this.gardener.userInfo(3, bob);
    console.log('Bob balance in pool0: ', user3.amount.toString());
    expect(user3.amount).is.bignumber.equal('1000');

    // Withdraw stake
    await this.gardener.withdraw(2, '1000', { from: bob });
    await this.gardener.withdraw(1, '1000', { from: alice });
    await this.gardener.withdraw(3, '1000', {from: bob});
    await this.gardener.leaveStaking(web3.utils.toWei('1000', 'ether'), {from: carol});

    aliceS33DBalance = await this.s33d.balanceOf(alice);
    expect(aliceS33DBalance).is.bignumber.equal(web3.utils.toWei('33', 'ether'));
    bobS33DBalance = await this.s33d.balanceOf(bob);
    expect(bobS33DBalance).is.bignumber.equal(web3.utils.toWei('21.12', 'ether'));
    carolS33DBalance = await this.s33d.balanceOf(carol);
    expect(carolS33DBalance).is.bignumber.equal(web3.utils.toWei('300046.2', 'ether'));
  });
  it('S33D burning through furnace', async () => {
    await this.gardener.setFurnace(carol, {from: minter});
    await this.gardener.incinerate({from: minter});
    carolS33DBalance = await this.s33d.balanceOf(carol);
    expect(carolS33DBalance).is.bignumber.equal('0');
  });
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
