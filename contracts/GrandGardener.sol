// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import '@pancakeswap/pancake-swap-lib/contracts/math/SafeMath.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/IBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/token/BEP20/SafeBEP20.sol';
import '@pancakeswap/pancake-swap-lib/contracts/access/Ownable.sol';

import "./S33DS.sol";

// import "@nomiclabs/buidler/console.sol";

// Grand Gardener is the master of S33DS. He can make S33D and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once S33D is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless. Love Gaia.
contract GrandGardener is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of S33Ds
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accS33DPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accS33DPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. S33Ds to distribute per block.
        uint256 lastRewardBlock;  // Last block number that S33Ds distribution occurs.
        uint256 accS33DPerShare; // Accumulated S33Ds per share, times 1e12. See below.
    }

    // The S33DS!
    S33DS public s33d;

    // Dev address.
    address public devaddr;
    // S33Ds created per block.
    uint256 public s33dPerBlock;
    // Bonus muliplier for early s33d growers.
    uint256 public BONUS_MULTIPLIER = 1;
    // Furnace address for burning
    address public furnace;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when S33D mining starts.
    uint256 public startBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        S33DS _s33d,
        address _devaddr,
        uint256 _s33dPerBlock,
        uint256 _startBlock
    ) public {
        s33d = _s33d;
        devaddr = _devaddr;
        s33dPerBlock = _s33dPerBlock;
        startBlock = _startBlock;
        furnace = address(s33d);

        // staking pool
        poolInfo.push(PoolInfo({
            lpToken: _s33d,
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accS33DPerShare: 0
        }));

        totalAllocPoint = 1000;

    }

    function updateMultiplier(uint256 multiplierNumber) public onlyOwner {
        BONUS_MULTIPLIER = multiplierNumber;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(uint256 _allocPoint, IBEP20 _lpToken, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accS33DPerShare: 0
        }));
        updateStakingPool();
    }

    // Update the given pool's S33D allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 prevAllocPoint = poolInfo[_pid].allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        if (prevAllocPoint != _allocPoint) {
            totalAllocPoint = totalAllocPoint.sub(prevAllocPoint).add(_allocPoint);
            updateStakingPool();
        }
    }

    function updateStakingPool() internal {
        uint256 length = poolInfo.length;
        uint256 points = 0;
        for (uint256 pid = 1; pid < length; ++pid) {
            points = points.add(poolInfo[pid].allocPoint);
        }
        if (points != 0) {
            points = points.div(4); // This defines the fraction for S33D - 20% of all S33D emission is exclusive to S33D stakers
            totalAllocPoint = totalAllocPoint.sub(poolInfo[0].allocPoint).add(points);
            poolInfo[0].allocPoint = points;
        }
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        return _to.sub(_from).mul(BONUS_MULTIPLIER);
    }

    // View function to see pending S33Ds on frontend.
    function pendingS33D(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accS33DPerShare = pool.accS33DPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 s33dReward = multiplier.mul(s33dPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accS33DPerShare = accS33DPerShare.add(s33dReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accS33DPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 s33dReward = multiplier.mul(s33dPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        // S33DS contract's owner is transferred to GrandGardener after initial emission
        // This is the only place where new S33D is introduced into the ecosystem
        s33d.mint(devaddr, s33dReward.div(33));
        s33d.mint(address(this), s33dReward);
        pool.accS33DPerShare = pool.accS33DPerShare.add(s33dReward.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to GrandGardener for S33D allocation.
    function deposit(uint256 _pid, uint256 _amount) public {

        require (_pid != 0, 'deposit S33D by staking');

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accS33DPerShare).div(1e12).sub(user.rewardDebt);
            if(pending > 0) {
                safeS33DTransfer(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accS33DPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from GrandGardener.
    function withdraw(uint256 _pid, uint256 _amount) public {

        require (_pid != 0, 'withdraw S33D by unstaking');
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accS33DPerShare).div(1e12).sub(user.rewardDebt);
        if(pending > 0) {
            safeS33DTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accS33DPerShare).div(1e12);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Stake S33D tokens to GrandGardener
    function enterStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        updatePool(0);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accS33DPerShare).div(1e12).sub(user.rewardDebt);
            if(pending > 0) {
                safeS33DTransfer(msg.sender, pending);
            }
        }
        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accS33DPerShare).div(1e12);

        emit Deposit(msg.sender, 0, _amount);
    }

    // Withdraw S33D tokens from STAKING.
    function leaveStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");   
        updatePool(0);
        uint256 pending = user.amount.mul(pool.accS33DPerShare).div(1e12).sub(user.rewardDebt);
        if(pending > 0) {
            safeS33DTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accS33DPerShare).div(1e12);

        emit Withdraw(msg.sender, 0, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Safe S33D transfer function, just in case if rounding error causes pool to not have enough S33Ds.
    function safeS33DTransfer(address _to, uint256 _amount) internal {
        uint256 s33dBal = s33d.balanceOf(address(this));
        if (_amount > s33dBal) {
            s33d.transfer(_to, s33dBal);
        } else {
            s33d.transfer(_to, _amount);
        }
    }

    // Update dev address by the previous dev.
    function dev(address _devaddr) public {
        require(msg.sender == devaddr, "dev: wut?");
        devaddr = _devaddr;
    }

    // Set target for incineration - burning address
    function setFurnace(address _target) public onlyOwner {
        furnace = _target;
    }

    // Incinerate and burn unwanted S33D from circulation
    function incinerate() public onlyOwner {
        s33d.burn(furnace, s33d.balanceOf(address(furnace)));
    }
}
