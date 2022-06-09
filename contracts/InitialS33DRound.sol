// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

// Reference libraries
import "@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol";
import "@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol";
import "@pancakeswap/pancake-swap-lib/contracts/access/Ownable.sol";

import "./S33DS.sol";

contract InitialS33DRound is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // S33DS contract
    S33DS public s33d;
    // Interface to USDT contract
    IBEP20 public usdt;

    // Variables
    uint256 public offerPrice;
    uint256 public buyLimit;

    // Mappings
    // Info of each user that acquires S33D token
    mapping(address => uint256) public contribution;
    // User whitelist for first sale 
    mapping(address => uint256) private allowList;
    // Events
    event BuyS33D(address indexed user, uint256 amount);

    // Contract functions start here
    constructor(
        S33DS _s33d,
        IBEP20 _usdt,
        uint256 _offerPrice,
        uint256 _buyLimit
    ) public {
        s33d = _s33d;
        usdt = _usdt;
        offerPrice = _offerPrice;
        buyLimit = _buyLimit;
    }

    // Returns the S33D balance held by caller
    function getS33DBalance() external view returns (uint256) {
        uint256 s33dBal = s33d.balanceOf(address(msg.sender));
        return s33dBal;
    }

    // Returns the USDT balance held by the caller
    function getUSDTBalance() public view returns (uint256) {
        uint256 usdtBal = usdt.balanceOf(address(msg.sender));
        return usdtBal;
    }

    // Returns the S33D pouch balance
    function getPouchBalance() public view returns (uint256) {
        uint256 pouchBalance = s33d.balanceOf(address(this));
        return pouchBalance;
    }

    // Check user whitelist status
    function getWhitelist() public view returns (uint256) {
        uint256 s33dLimit = allowList[msg.sender];
        return s33dLimit;
    }

    // Acquire S33D with USDT according to offer price
    function buyS33D(uint256 _amount) public {
        uint256 totalPayable = _amount * offerPrice / 1 ether;
        // Check that purchase does not exceed buy limit
        uint256 totalBought = contribution[msg.sender] + _amount;
        require(allowList[msg.sender] > 0, "buyS33D: not whitelisted - register on s33d.app");
        require(totalBought <= allowList[msg.sender], "buyS33D: exceeded whitelist limit");
        require(totalBought <= buyLimit, "buyS33D: exceeded allowed purchase limit");
        // Check that user has enough to pay
        uint256 usdtBal = getUSDTBalance();
        require(usdtBal >= totalPayable, "buyS33D: not enough USDT");
        // Transfer the payable amount to FirstSale contract
        // Note: approval must be acquired before transferFrom can work
        usdt.transferFrom(address(msg.sender), address(this), totalPayable);
        // Send S33D to buyer
        s33d.transfer(address(msg.sender), _amount);
        contribution[msg.sender] = contribution[msg.sender] + _amount;
        emit BuyS33D(msg.sender, _amount);
    }

    // Sets the number of S33D one wallet can buy
    function setBuyLimit(uint256 _amount) external onlyOwner {
        buyLimit = _amount;
    }

    // Sets the offer price of S33D
    function setOfferPrice(uint256 _price) external onlyOwner {
        offerPrice = _price;
    }

    // Sends all proceeds to caller
    function withdrawAllUSDT() external onlyOwner {
        uint256 usdtBal = usdt.balanceOf(address(this));
        usdt.transfer(address(msg.sender), usdtBal);
    }

    // Set user whitelist
    function setAllowList(address[] calldata addresses, uint256 mintLimit) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowList[addresses[i]] = mintLimit;
        }
    }
}
