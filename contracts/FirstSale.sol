// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

// Reference libraries
import '@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/access/Ownable.sol';

import "./S33DS.sol";

contract FirstSale is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of contributors
    struct Contributor {
        uint amount;
    }
    mapping (uint256 => mapping (address => Contributor)) public contributor;

    // S33DS contract
    S33DS public s33d;
    IBEP20 usdt;

    event BuyS33D(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        S33DS _s33d,
        IBEP20 _usdt
    ) public {
        s33d = _s33d;
        usdt = _usdt;
    }
    
    function getS33DBalance() external view returns (uint256) {
        uint256 s33dBal = s33d.balanceOf(address(msg.sender));
        return s33dBal;
    }

    function getUSDTBalance() external view returns (uint256) {
        uint256 usdtBal = usdt.balanceOf(address(msg.sender));
        return usdtBal;
    }
}