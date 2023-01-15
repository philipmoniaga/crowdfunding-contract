// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {TerminalUtility, ITerminalDirectory} from "./abstract/TerminalUtility.sol";
import {IProjects} from "./interfaces/IProjects.sol";
import {
    AuctionedPass,
    IFundingCycles,
    FundingCycleState,
    FundingCycleParameter,
    FundingCycleProperties
} from "./interfaces/IFundingCycles.sol";

contract FundingCycles is IFundingCycles, TerminalUtility {
    /*╔═════════════════════════════╗
      ║   Private Stored Constants  ║
      ╚═════════════════════════════╝*/

    // The number of seconds in a day.
    uint256 private constant SECONDS_IN_DAY = 3600; // TODO 1 hour

    // The max percentage of funds lock in treasury 100%
    uint256 private constant MAX_LOCK_RATE = 1e4;

    /*╔═════════════════════════════╗
      ║   Private Stored Properties ║
      ╚═════════════════════════════╝*/

    // Stores the amount that has been tapped within each funding cycle.
    // TODO: Accept with ETH only, should we add ERC20 tokens?
    mapping(uint256 => uint256) private _tappedOf;

    // Stores the amount that has been contributed of each funding cycle.
    // TODO: Accept with ETH only, should we add ERC20 tokens?
    mapping(uint256 => uint256) private _depositedOf;

    // Stores the amount that has been unlocked of each funding cycle.
    // TODO: Accept with ETH only, should we add ERC20 tokens?
    mapping(uint256 => uint256) private _unLockedOf;
    
    // mapping fundingCycleId with auctionPass
    mapping(bytes32 => AuctionedPass) private _fundingCycleIdAuctionedPass;

    /*╔═════════════════════════════╗
      ║    Public Stored Constants  ║
      ╚═════════════════════════════╝*/

    uint8 public constant override MAX_CYCLE_LIMIT = 32;

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/

    /// @notice The total number of funding cycles created, which is used for issuing funding cycle IDs.
    /// @dev Funding cycles have IDs > 0.
    uint256 public override count;

    // mapping id with funding cycle properties
    mapping(uint256 => FundingCycleProperties) public fundingCycleProperties;

    // mapping projectId with latest funding cycle properties id
    mapping(uint256 => uint256) public override latestIdFundingProject;

    /*╔══════════════════╗
      ║   External VIEW  ║
      ╚══════════════════╝*/
      
    /**
        @notice 
        Get the funding cycle with the given ID

        @param _fundingCycleId The ID of the funding cycle to get
     */
    function getFundingCycle(uint256 _fundingCycleId)
        public
        view
        override
        returns (FundingCycleProperties memory)
    {
        return fundingCycleProperties[_fundingCycleId];
    }

    /**
        @notice
        Current active funding cycle of this dao project

        @param _projectId The ID of project
     */
    function currentOf(uint256 _projectId)
        external
        view
        override
        returns (FundingCycleProperties memory)
    {
        uint256 latestId = latestIdFundingProject[_projectId];
        return getFundingCycle(latestId);
    }

    /**
        @notice
        Get the tappable amount of giving funding cycle

        @param _fundingCycleId The ID of funding cycle to get max tappable amount
     */
    function getTappableAmount(uint256 _fundingCycleId)
        public
        override
        view
        returns (uint256 _totalTappable)
    {
        FundingCycleProperties memory _fundingCycle = fundingCycleProperties[_fundingCycleId];

        uint256 _eligibleDeposited = _getEligibleDepositedAmount(_fundingCycleId);
        uint256 _baseTappable = (_eligibleDeposited * (1e4 - _fundingCycle.lockRate)) / 1e4;

        _totalTappable = _baseTappable + _unLockedOf[_fundingCycleId] - _tappedOf[_fundingCycleId];
    }

    /**
        @notice
        Return the state of giving funding cycle

        @param _fundingCycleId The ID of funding cycle to get state
     */
    function getFundingCycleState(uint256 _fundingCycleId) public override view returns(FundingCycleState) {
        FundingCycleProperties memory _fundingCycle = fundingCycleProperties[_fundingCycleId];

        if (block.timestamp < _fundingCycle.start) return FundingCycleState.WarmUp;
        if (block.timestamp >= _fundingCycle.start + (_fundingCycle.duration * SECONDS_IN_DAY)) return FundingCycleState.Expired;

        return FundingCycleState.Active;
    }
    
    function getAutionedPass(uint256 _fundingCycleId, uint256 _tierId) external override view returns(AuctionedPass memory) {
        bytes32 _autionKey = keccak256(abi.encodePacked(_fundingCycleId, "-", _tierId));
        
        return _fundingCycleIdAuctionedPass[_autionKey];
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/
    constructor(ITerminalDirectory _terminalDirectory) TerminalUtility(_terminalDirectory) {}

    /**
        @notice
        configure funding cycle
        return a new funding cycle by call init if there is no funding cycle exist in the project
        return existing funding cycle if the funding cycle still active in the project
        return new funding cycle if there is no active funding cycle

        @param _projectId Dao Id
        @param _params The parameters for Funding Cycle
        @param _auctionedPass auction pass information
     */
    function configure(
        uint256 _projectId,
        FundingCycleParameter calldata _params,
        AuctionedPass[] calldata _auctionedPass
    ) external override onlyTerminal(_projectId) returns (FundingCycleProperties memory) {
        if (_params.duration >= type(uint16).max) revert BadDuration();
        
        if (_params.lockRate > MAX_LOCK_RATE) revert BadLockRate();

        // Currency must be less than the limit.
        if (_params.cycleLimit > MAX_CYCLE_LIMIT) revert BadCycleLimit();

        uint256 configTime = block.timestamp;

        if (latestIdFundingProject[_projectId] == 0) {
            //create a new one and return it because no fundingcycle active
            uint256 fundingCycleId = _init(_projectId, 0, _params);
            for (uint256 i; i < _auctionedPass.length;) {
                bytes32 _autionKey = keccak256(abi.encodePacked(fundingCycleId, "-", _auctionedPass[i].id));
                _fundingCycleIdAuctionedPass[_autionKey] = _auctionedPass[i];
                emit InitAuctionedPass(fundingCycleId, _auctionedPass[i]);

                unchecked {
                    i++;
                }
            }

            emit Configure(fundingCycleId, _projectId, configTime, msg.sender);

            return getFundingCycle(fundingCycleId);
        } else {
            //check if the latestIdFunding project still running
            uint256 latestId = latestIdFundingProject[_projectId];
            FundingCycleProperties memory latestFundingCycleProperties = fundingCycleProperties[
                latestId
            ];
            if (
                block.timestamp >= latestFundingCycleProperties.start &&
                block.timestamp <=
                latestFundingCycleProperties.start +
                    (latestFundingCycleProperties.duration * SECONDS_IN_DAY)
            ) {
                emit FundingCycleExist(latestId, _projectId, configTime, msg.sender);

                return latestFundingCycleProperties;
            }

            uint256 fundingCycleId = _init(_projectId, latestId,_params);
            
            for (uint256 i; i < _auctionedPass.length;) {
                bytes32 _preAutionKey = keccak256(abi.encodePacked(fundingCycleId, "-", _auctionedPass[i].id));
                if ((_auctionedPass[i].saleAmount + _auctionedPass[i].communityAmount + _auctionedPass[i].reservedAmount) > _fundingCycleIdAuctionedPass[_preAutionKey].reservedAmount) {
                    revert InsufficientBalance();
                }

                _fundingCycleIdAuctionedPass[keccak256(abi.encodePacked(fundingCycleId, "-", _auctionedPass[i].id))] = _auctionedPass[i];
                emit InitAuctionedPass(fundingCycleId, _auctionedPass[i]);
                
                unchecked {
                    i++;
                }
            }
            emit Configure(fundingCycleId, _projectId, configTime, msg.sender);
            return getFundingCycle(fundingCycleId);
        }
    }

    /**
        @notice
        Update the contribute status of giving project

        @param _projectId The project ID to update
        @param _paused Paused or not
     */
    function setPauseFundingCycle(uint256 _projectId, bool _paused)
        external
        override
        onlyTerminal(_projectId)
        returns (bool)
    {
        uint256 latestId = latestIdFundingProject[_projectId];
        FundingCycleProperties storage latestFundingCycleProperties = fundingCycleProperties[
            latestId
        ];
        latestFundingCycleProperties.isPaused = _paused;
        return true;
    }

    /**
        @notice
        Update the total deposited funds of funding cycle, include overflowed funds

        @param _projectId The project ID of funding cycle belongs to
        @param _fundingCycleId The ID of funding cycle to update records
        @param _amount The amount of tap
     */
    function updateLocked(uint256 _projectId, uint256 _fundingCycleId, uint256 _amount) external override onlyTerminal(_projectId) {
        _depositedOf[_fundingCycleId] += _amount;

        emit UpdateLocked(_projectId, _fundingCycleId, _amount, _depositedOf[_fundingCycleId]);
    }

    /**
        @notice
        Tap the funds from funding cycle

        @param _projectId The project ID of funding cycle belongs to
        @param _fundingCycleId The ID of funding cycle to tap funds
        @param _amount The amount of tap
     */
    function tap(uint256 _projectId, uint256 _fundingCycleId, uint256 _amount) external override onlyTerminal(_projectId) {
        uint256 _total = getTappableAmount(_fundingCycleId);
        if (_amount > _total) revert InsufficientBalance();

        _tappedOf[_fundingCycleId] += _amount;

        emit Tap(_projectId, _fundingCycleId, _amount);
    }

    /**
        @notice
        Unlock the funds in project's treasury, only can unlock by funding cycle

        @param _projectId The project ID of funding cycle belongs to
        @param _fundingCycleId The ID of funding cycle to unlock funds
        @param _amount The amount of unlock
     */
    function unlock(uint256 _projectId, uint256 _fundingCycleId, uint256 _amount) external override onlyTerminal(_projectId) {
        uint256 _total = _getUnLockableAmount(_fundingCycleId);
        if (_amount > _total) revert InsufficientBalance();

        _unLockedOf[_fundingCycleId] += _amount;

        emit Unlock(_projectId, _fundingCycleId, _amount, _unLockedOf[_fundingCycleId]);
    }


    /*╔═════════════════════════════╗
      ║   Private Helper Functions  ║
      ╚═════════════════════════════╝*/

    /**
        @notice
        Initializes a funding cycle with the appropriate properties

        @param _projectId The ID of the DAO
        @param _previousId previous funding cycle id before this funding cycle
        @param _params The parameters for Funding Cycle
     */
    function _init(
        uint256 _projectId,
        uint256 _previousId,
        FundingCycleParameter calldata _params
    ) private returns (uint256 newFundingCycleId) {
        count += 1;
        FundingCycleProperties memory newFundingCycle = FundingCycleProperties({
            id: count,
            projectId: _projectId,
            // @TODO delay start time for 5 mins
            start: block.timestamp + 300,
            duration: _params.duration,
            cycleLimit: _params.cycleLimit,
            isPaused: false,
            previousId: _previousId,
            target: _params.target,
            lockRate: _params.lockRate
        });
        latestIdFundingProject[_projectId] = newFundingCycle.id;
        fundingCycleProperties[count] = newFundingCycle;

        emit Init(
            count,
            _projectId,
            _previousId,
            newFundingCycle.start,
            _params.duration,
            _params.target,
            _params.lockRate
        );
        return count;
    }

    /**
        @notice
        Get the unlockable amount of giving funding cycle

        @param _fundingCycleId The ID of funding cycle to get unlockable amount
     */
    function _getUnLockableAmount(uint256 _fundingCycleId)
        private
        view
        returns (uint256 _totalUnLockable)
    {
        FundingCycleProperties memory _fundingCycle = fundingCycleProperties[_fundingCycleId];

        uint256 _eligibleDeposited = _getEligibleDepositedAmount(_fundingCycleId);
        uint256 _lockedAmount = (_eligibleDeposited * _fundingCycle.lockRate) / 1e4;

        _totalUnLockable = _lockedAmount - _unLockedOf[_fundingCycleId];
    }

    /**
        @notice
        Get the eligible amount of giving funding cycle, return the smaller value of target rising amount and actually deposit amount

        @param _fundingCycleId The ID of funding cycle to get eligible amount
     */
    function _getEligibleDepositedAmount(uint256 _fundingCycleId)
        private
        view
        returns (uint256 _eligibleAmount)
    {
        FundingCycleProperties memory _fundingCycle = fundingCycleProperties[_fundingCycleId];
        uint256 _deposited = _depositedOf[_fundingCycleId];

        _eligibleAmount = _deposited >= _fundingCycle.target ? _fundingCycle.target : _deposited;
    }
}
