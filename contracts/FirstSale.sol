// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

// Reference libraries
import "@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol";
import "@pancakeswap/pancake-swap-lib/contracts/access/Ownable.sol";

import "./S33DS.sol";

contract FirstSale is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of contributors
    struct Contributor {
        uint256 amount;
    }

    // S33DS contract
    S33DS public s33d;
    // Interface to USDT contract
    IBEP20 public usdt;

    // Variables
    uint256 public offerPrice;

    // Mappings
    mapping(uint256 => mapping(address => Contributor)) public contributor; // Info of each user that acquires S33D token

    // Events
    event BuyS33D(address indexed user, uint256 amount);

    // Contract functions start here
    constructor(
        S33DS _s33d,
        IBEP20 _usdt,
        uint256 _offerPrice
    ) public {
        s33d = _s33d;
        usdt = _usdt;
        offerPrice = _offerPrice;
    }

    function getS33DBalance() external view returns (uint256) {
        uint256 s33dBal = s33d.balanceOf(address(msg.sender));
        return s33dBal;
    }

    function getUSDTBalance() public view returns (uint256) {
        uint256 usdtBal = usdt.balanceOf(address(msg.sender));
        return usdtBal;
    }

    function buyS33D(uint256 _amount) public {
        uint256 totalPayable = _amount * offerPrice;
        uint256 usdtBal = getUSDTBalance();
        require(usdtBal >= totalPayable, "buyS33D: not enough USDT");
        // Transfer the payable amount to FirstSale contract
        // Note: approval must be acquired before transferFrom can work
        usdt.transferFrom(address(msg.sender), address(this), totalPayable);
        // Send S33D to buyer
        s33d.transfer(address(msg.sender), _amount);
        emit BuyS33D(msg.sender, _amount);
    }

    function withdrawAll() public onlyOwner {
        uint256 usdtBal = usdt.balanceOf(address(this));
        usdt.transfer(address(msg.sender), usdtBal);
    }
}
