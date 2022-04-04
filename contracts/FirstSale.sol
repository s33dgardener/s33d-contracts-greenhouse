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

    address payable public deposit;
    uint tokenPrice = 1;
    uint public hardCap = 33333333;
    uint public raisedAmount;
    uint public saleStart = block.timestamp;
    uint public saleEnd = block.timestamp + 604800; // one week from start of sale
    uint public tokenTradeStart = saleEnd + 604800; // can overide the transfer function and add a restriction on how quickly the tokens could be traded 
    uint public maxInvestment = 100;
    uint public minInvestment = 1;
    

    // Info of contributors
    struct Contributor {
        uint amount;
        uint index;
    }

    

    enum State{beforeStart, running, afterEnd, halted}
    State public icoState;

    mapping (uint256 => mapping (address => Contributor)) public contributor;

    // S33DS contract
    S33DS public s33d;
    IBEP20 usdt;

    event BuyS33D(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        S33DS _s33d,
        IBEP20 _usdt,
        address _deposit
        
    ) public {
        s33d = _s33d;
        usdt = _usdt;
        _deposit = deposit;
        

        

    }

     function halt() public onlyOwner{
        icoState = State.halted;
    }

    function resume() public onlyOwner{
        icoState = State.running;
    }
    
    function getS33DBalance() external view returns (uint256) {
        uint256 s33dBal = s33d.balanceOf(address(msg.sender));
        return s33dBal;
    }

    function getUSDTBalance() external view returns (uint256) {
        uint256 usdtBal = usdt.balanceOf(address(msg.sender));
        return usdtBal;
    }

    function getCurrentState() public view returns(State) {
        if(icoState == State.halted){
            return State.halted;
        }else if(block.timestamp < saleStart){
            return State.beforeStart;
        }else if(block.timestamp >= saleStart && block.timestamp <= saleEnd){
            return State.running;
        }else{
            return State.afterEnd;
        }
    }

    function invest() payable public returns(bool){
        icoState = getCurrentState();
        require(icoState == State.running);

        require(msg.value >= minInvestment && msg.value <= maxInvestment);
        raisedAmount += msg.value;
        require(raisedAmount <= hardCap);

        Contributor memory contribution;
        contribution.amount = msg.value;
        contribution.index ++;

        uint s33dtokens = msg.value/tokenPrice;

        uint s33dBalance = s33d.balanceOf(address(msg.sender));

        s33dBalance += s33dtokens;
        s33dBalance -= s33dtokens;

        deposit.transfer(msg.value);
        emit BuyS33D(msg.sender, msg.value, s33dtokens);

        return true;        
    }

     receive () payable external{
        invest();
    }

}