const { assert } = require('chai');

const S33DS = artifacts.require('S33DS');

contract('S33DS', ([alice, bob, carol, dev, minter]) => {
  beforeEach(async () => {
    this.s33d = await S33DS.new({ from: minter });
  });

  it('mint', async () => {
    await this.s33d.mint(alice, 33333333333, { from: minter });
    assert.equal((await this.s33d.balanceOf(alice)).toString(), '33333333333');
  });

  it('burn', async () => {
    await this.s33d.mint(alice, 22222222, { from: minter });
    await this.s33d.mint(bob, 11111111, { from: minter });
    assert.equal((await this.s33d.totalSupply()).toString(), '33333333');
    await this.s33d.burn(alice, 11111111, { from: minter });

    assert.equal((await this.s33d.balanceOf(alice)).toString(), '11111111');
    assert.equal((await this.s33d.totalSupply()).toString(), '22222222');
  });

});
