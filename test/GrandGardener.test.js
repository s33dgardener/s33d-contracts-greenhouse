const { expectRevert, time } = require('@openzeppelin/test-helpers');
const S33DS = artifacts.require('S33DS');
const GrandGardener = artifacts.require('GrandGardener');
const MockBEP20 = artifacts.require('libs/MockBEP20');

contract('GrandGardener', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.s33d = await S33DS.new({ from: minter });
        this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: minter });
        this.lp2 = await MockBEP20.new('LPToken', 'LP2', '1000000', { from: minter });
        this.lp3 = await MockBEP20.new('LPToken', 'LP3', '1000000', { from: minter });
        this.gardener = await GrandGardener.new(this.s33d.address, dev, '1000', '100', { from: minter });
        await this.s33d.transferOwnership(this.gardener.address, { from: minter });

        await this.lp1.transfer(bob, '2000', { from: minter });
        await this.lp2.transfer(bob, '2000', { from: minter });
        await this.lp3.transfer(bob, '2000', { from: minter });

        await this.lp1.transfer(alice, '2000', { from: minter });
        await this.lp2.transfer(alice, '2000', { from: minter });
        await this.lp3.transfer(alice, '2000', { from: minter });
    });
    it('real case', async () => {
      this.lp4 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: minter });
      this.lp5 = await MockBEP20.new('LPToken', 'LP2', '1000000', { from: minter });
      this.lp6 = await MockBEP20.new('LPToken', 'LP3', '1000000', { from: minter });
      this.lp7 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: minter });
      this.lp8 = await MockBEP20.new('LPToken', 'LP2', '1000000', { from: minter });
      this.lp9 = await MockBEP20.new('LPToken', 'LP3', '1000000', { from: minter });
      await this.gardener.add('2000', this.lp1.address, true, { from: minter });
      await this.gardener.add('1000', this.lp2.address, true, { from: minter });
      await this.gardener.add('500', this.lp3.address, true, { from: minter });
      await this.gardener.add('500', this.lp3.address, true, { from: minter });
      await this.gardener.add('500', this.lp3.address, true, { from: minter });
      await this.gardener.add('500', this.lp3.address, true, { from: minter });
      await this.gardener.add('500', this.lp3.address, true, { from: minter });
      await this.gardener.add('100', this.lp3.address, true, { from: minter });
      await this.gardener.add('100', this.lp3.address, true, { from: minter });
      assert.equal((await this.gardener.poolLength()).toString(), "10");

      await time.advanceBlockTo('170');
      await this.lp1.approve(this.gardener.address, '1000', { from: alice });
      assert.equal((await this.s33d.balanceOf(alice)).toString(), '0');
      await this.gardener.deposit(1, '20', { from: alice });
      await this.gardener.withdraw(1, '20', { from: alice });
      assert.equal((await this.s33d.balanceOf(alice)).toString(), '263');

      await this.s33d.approve(this.gardener.address, '1000', { from: alice });
      await this.gardener.enterStaking('20', { from: alice });
      await this.gardener.enterStaking('0', { from: alice });
      await this.gardener.enterStaking('0', { from: alice });
      await this.gardener.enterStaking('0', { from: alice });
      assert.equal((await this.s33d.balanceOf(alice)).toString(), '993');
      // assert.equal((await this.gardener.getPoolPoint(0, { from: minter })).toString(), '1900');
    })


    it('deposit/withdraw', async () => {
      await this.gardener.add('1000', this.lp1.address, true, { from: minter });
      await this.gardener.add('1000', this.lp2.address, true, { from: minter });
      await this.gardener.add('1000', this.lp3.address, true, { from: minter });

      await this.lp1.approve(this.gardener.address, '100', { from: alice });
      await this.gardener.deposit(1, '20', { from: alice });
      await this.gardener.deposit(1, '0', { from: alice });
      await this.gardener.deposit(1, '40', { from: alice });
      await this.gardener.deposit(1, '0', { from: alice });
      assert.equal((await this.lp1.balanceOf(alice)).toString(), '1940');
      await this.gardener.withdraw(1, '10', { from: alice });
      assert.equal((await this.lp1.balanceOf(alice)).toString(), '1950');
      assert.equal((await this.s33d.balanceOf(alice)).toString(), '999');
      assert.equal((await this.s33d.balanceOf(dev)).toString(), '100');

      await this.lp1.approve(this.gardener.address, '100', { from: bob });
      assert.equal((await this.lp1.balanceOf(bob)).toString(), '2000');
      await this.gardener.deposit(1, '50', { from: bob });
      assert.equal((await this.lp1.balanceOf(bob)).toString(), '1950');
      await this.gardener.deposit(1, '0', { from: bob });
      assert.equal((await this.s33d.balanceOf(bob)).toString(), '125');
      await this.gardener.emergencyWithdraw(1, { from: bob });
      assert.equal((await this.lp1.balanceOf(bob)).toString(), '2000');
    })

    it('staking/unstaking', async () => {
      await this.gardener.add('1000', this.lp1.address, true, { from: minter });
      await this.gardener.add('1000', this.lp2.address, true, { from: minter });
      await this.gardener.add('1000', this.lp3.address, true, { from: minter });

      await this.lp1.approve(this.gardener.address, '10', { from: alice });
      await this.gardener.deposit(1, '2', { from: alice }); //0
      await this.gardener.withdraw(1, '2', { from: alice }); //1

      await this.s33d.approve(this.gardener.address, '250', { from: alice });
      await this.gardener.enterStaking('240', { from: alice }); //3
      assert.equal((await this.s33d.balanceOf(alice)).toString(), '10');
      await this.gardener.enterStaking('10', { from: alice }); //4
      assert.equal((await this.s33d.balanceOf(alice)).toString(), '249');
      await this.gardener.leaveStaking(250);
      assert.equal((await this.s33d.balanceOf(alice)).toString(), '749');

    });


    it('update multiplier', async () => {
      await this.gardener.add('1000', this.lp1.address, true, { from: minter });
      await this.gardener.add('1000', this.lp2.address, true, { from: minter });
      await this.gardener.add('1000', this.lp3.address, true, { from: minter });

      await this.lp1.approve(this.gardener.address, '100', { from: alice });
      await this.lp1.approve(this.gardener.address, '100', { from: bob });
      await this.gardener.deposit(1, '100', { from: alice });
      await this.gardener.deposit(1, '100', { from: bob });
      await this.gardener.deposit(1, '0', { from: alice });
      await this.gardener.deposit(1, '0', { from: bob });

      await this.s33d.approve(this.gardener.address, '100', { from: alice });
      await this.s33d.approve(this.gardener.address, '100', { from: bob });
      await this.gardener.enterStaking('50', { from: alice });
      await this.gardener.enterStaking('100', { from: bob });

      await this.gardener.updateMultiplier('0', { from: minter });

      await this.gardener.enterStaking('0', { from: alice });
      await this.gardener.enterStaking('0', { from: bob });
      await this.gardener.deposit(1, '0', { from: alice });
      await this.gardener.deposit(1, '0', { from: bob });

      assert.equal((await this.s33d.balanceOf(alice)).toString(), '700');
      assert.equal((await this.s33d.balanceOf(bob)).toString(), '150');

      await time.advanceBlockTo('265');

      await this.gardener.enterStaking('0', { from: alice });
      await this.gardener.enterStaking('0', { from: bob });
      await this.gardener.deposit(1, '0', { from: alice });
      await this.gardener.deposit(1, '0', { from: bob });

      assert.equal((await this.s33d.balanceOf(alice)).toString(), '700');
      assert.equal((await this.s33d.balanceOf(bob)).toString(), '150');

      await this.gardener.leaveStaking('50', { from: alice });
      await this.gardener.leaveStaking('100', { from: bob });
      await this.gardener.withdraw(1, '100', { from: alice });
      await this.gardener.withdraw(1, '100', { from: bob });

    });

    it('should allow dev and only dev to update dev', async () => {
        assert.equal((await this.gardener.devaddr()).valueOf(), dev);
        await expectRevert(this.gardener.dev(bob, { from: bob }), 'dev: wut?');
        await this.gardener.dev(bob, { from: dev });
        assert.equal((await this.gardener.devaddr()).valueOf(), bob);
        await this.gardener.dev(alice, { from: bob });
        assert.equal((await this.gardener.devaddr()).valueOf(), alice);
    })
});
