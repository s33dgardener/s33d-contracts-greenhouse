const { assert } = require("chai");

const S33DS = artifacts.require('S33DS');

contract('S33DS', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.s33d = await S33DS.new({ from: minter });
    });


    it('mint', async () => {
        await this.s33d.mint(alice, 3333, { from: minter });
        assert.equal((await this.s33d.balanceOf(alice)).toString(), '3333');
    })
});
