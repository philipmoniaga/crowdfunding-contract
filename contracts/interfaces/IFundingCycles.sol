// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

enum FundingCycleState {
    WarmUp,
    Active,
    Expired
}

struct Metadata {
    // The unique handle name for the DAO
    bytes32 handle;
    // The NFT token address of Customized Boosters
    address[] customBoosters;
    // The multipliers of customized NFT 
    uint16[] boosterMultipliers;
}

struct AuctionedPass {
    // tier id, indexed from 0
    uint256 id;
    // sale price in wei
    uint256 salePrice;
    // the amount of tickets open for sale in this round
    uint256 saleAmount;
    // the amount of tickets airdroped to community
    uint256 communityAmount;
    // who own the community vouchers can free mint the community ticket
    address communityVoucher;
    // the amount of tickets reserved to next round
    uint256 reservedAmount;
}

// 1st funding cycle:
// gold ticket (erc1155) :  11 salePrice 1 reserveampiunt

// silver ticket: 10 salePrice  2 reserveampiunt

struct FundingCycleProperties {
    uint256 id;
    uint256 projectId;
    uint256 previousId;
    uint256 start;
    uint256 target;
    uint256 lockRate;
    uint16 duration;
    bool isPaused;
    uint256 cycleLimit;
}

struct FundingCycleParameter {
    // rate to be locked in treasury 1000 -> 10% 9999 -> 99.99%
    uint16 lockRate;
    uint16 duration;
    uint256 cycleLimit;
    uint256 target;
}

interface IFundingCycles {
    event Configure(
        uint256 indexed fundingCycleId,
        uint256 indexed projectId,
        uint256 reconfigured,
        address caller
    );

    event FundingCycleExist(
        uint256 indexed fundingCycleId,
        uint256 indexed projectId,
        uint256 reconfigured,
        address caller
    );

    event Tap(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        uint256 tapAmount
    );

    event Unlock(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        uint256 unlockAmount,
        uint256 totalUnlockedAmount
    );

    event Init(
        uint256 indexed fundingCycleId,
        uint256 indexed projectId,
        uint256 previous,
        uint256 start,
        uint256 duration,
        uint256 target,
        uint256 lockRate
    );

    event InitAuctionedPass(
        uint256 indexed fundingCycleId,
        AuctionedPass autionPass
    );

    event UpdateLocked(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        uint256 depositAmount,
        uint256 totalDepositedAmount
    );

    error InsufficientBalance();
    error BadCycleLimit();
    error BadDuration();
    error BadLockRate();


    // === External View  === // 
    function latestIdFundingProject(uint256 _projectId) external view returns (uint256);

    function count() external view returns (uint256);

    function MAX_CYCLE_LIMIT() external view returns (uint8);

    function getFundingCycle(uint256 _fundingCycleId)
        external
        view
        returns (FundingCycleProperties memory);

    function configure(
        uint256 _projectId,
        FundingCycleParameter calldata _params,
        AuctionedPass[] memory _auctionedPass
    ) external returns (FundingCycleProperties memory);

    // === External Transactions === //
    function currentOf(uint256 _projectId) external view returns (FundingCycleProperties memory);

    function setPauseFundingCycle(uint256 _projectId, bool _paused) external returns (bool);

    function updateLocked(uint256 _projectId, uint256 _fundingCycleId, uint256 _amount) external;

    function tap(uint256 _projectId, uint256 _fundingCycleId, uint256 _amount) external;

    function unlock(uint256 _projectId, uint256 _fundingCycleId, uint256 _amount) external;

    function getTappableAmount(uint256 _fundingCycleId) external view returns (uint256);

    function getFundingCycleState(uint256 _fundingCycleId) external view returns (FundingCycleState);

    function getAutionedPass(uint256 _fundingCycleId, uint256 _tierId) external view returns(AuctionedPass memory);
}
