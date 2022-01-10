// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/access/Ownable.sol';

import './GrandGardener.sol';

contract LotteryRewardPool is Ownable {
    using SafeBEP20 for IBEP20;

    GrandGardener public gardener;
    address public adminAddress;
    address public receiver;
    IBEP20 public lptoken;
    IBEP20 public s33d;

    constructor(
        GrandGardener _gardener,
        IBEP20 _s33d,
        address _admin,
        address _receiver
    ) public {
        gardener = _gardener;
        s33d = _s33d;
        adminAddress = _admin;
        receiver = _receiver;
    }

    event StartFarming(address indexed user, uint256 indexed pid);
    event Harvest(address indexed user, uint256 indexed pid);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "admin: wut?");
        _;
    }

    function startFarming(uint256 _pid, IBEP20 _lptoken, uint256 _amount) external onlyAdmin {
        _lptoken.safeApprove(address(gardener), _amount);
        gardener.deposit(_pid, _amount);
        emit StartFarming(msg.sender, _pid);
    }

    function  harvest(uint256 _pid) external onlyAdmin {
        gardener.deposit(_pid, 0);
        uint256 balance = s33d.balanceOf(address(this));
        s33d.safeTransfer(receiver, balance);
        emit Harvest(msg.sender, _pid);
    }

    function setReceiver(address _receiver) external onlyAdmin {
        receiver = _receiver;
    }

    function  pendingReward(uint256 _pid) external view returns (uint256) {
        return gardener.pendingS33D(_pid, address(this));
    }

    // EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        s33d.safeTransfer(address(msg.sender), _amount);
        emit EmergencyWithdraw(msg.sender, _amount);
    }

    function setAdmin(address _admin) external onlyOwner {
        adminAddress = _admin;
    }

}
