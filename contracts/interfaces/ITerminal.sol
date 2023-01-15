// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IProjects.sol";
import "./IFundingCycles.sol";
import "./ITerminalDirectory.sol";
import "./IBluechipsBooster.sol";
import "./IDAOGovernorBooster.sol";
import "./IMembershipPassBooth.sol";
import "./IPayoutStore.sol";

struct ImmutablePassTier {
    uint256 tierFee;
    uint256 multiplier;
    uint256 tierCapacity;
}

interface ITerminal {
    event Pay(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        address indexed beneficiary,
        uint256 amount,
        uint256[] tiers,
        uint256[] amounts,
        string note
    );

    event Airdrop(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        address indexed beneficiary,
        uint256[] tierIds,
        uint256[] amounts,
        string note
    );

    event Claim(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        address indexed beneficiary,
        uint256 refundAmount,
        uint256[] offeringAmounts
    );

    event Tap(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        address indexed beneficiary,
        uint256 govFeeAmount,
        uint256 netTransferAmount
    );

    event AddToBalance(uint256 indexed projectId, uint256 amount, address beneficiary);

    event UnlockTreasury(uint256 indexed projectId, uint256 unlockAmount);

    event SetTapFee(uint256 fee);

    event SetContributeFee(uint256 fee);

    event SetMinLockRate(uint256 minLockRate);

    event DistributeToPayoutMod(uint256 indexed projectId, uint256 indexed fundingCycleId, PayoutMod mod, uint256 amount, address receiver);

    error Voucher721(address _voucher);
    error NoCommunityTicketLeft();
    error FundingCycleNotExist();
    error FundingCyclePaused();
    error FundingCycleActived();
    error InsufficientBalance();
    error AlreadyClaimed();
    error ZeroAddress();
    error BadOperationPeriod();
    error OnlyGovernor();
    error UnAuthorized();
    error LastWeightMustBe1();
    error BadPayment();
    error BadAmount();
    error BadLockRate();
    error BadTapFee();

    function superAdmin() external view returns (address);

    function tapFee() external view returns (uint256);

    function contributeFee() external view returns (uint256);

    function devTreasury() external view returns (address);

    function minLockRate() external view returns (uint256);

    function projects() external view returns (IProjects);

    function fundingCycles() external view returns (IFundingCycles);

    function membershipPassBooth() external view returns (IMembershipPassBooth);

    function daoGovernorBooster() external view returns (IDAOGovernorBooster);

    function bluechipsBooster() external view returns (IBluechipsBooster);

    function terminalDirectory() external view returns (ITerminalDirectory);

    function payoutStore() external view returns (IPayoutStore);

    function balanceOf(uint256 _projectId) external view returns (uint256);

    function addToBalance(uint256 _projectId) external payable;

    function setTapFee(uint256 _fee) external;

    function setContributeFee(uint256 _fee) external;

    function setMinLockRate(uint256 _minLockRate) external;

    function createDao(
        Metadata memory _metadata,
        ImmutablePassTier[] calldata _tiers,
        FundingCycleParameter calldata _params,
        AuctionedPass[] calldata _auctionedPass,
        PayoutMod[] memory _payoutMods
    ) external;

    function createNewFundingCycle(
        uint256 projectId,
        FundingCycleParameter calldata _params,
        AuctionedPass[] calldata _auctionedPass,
        PayoutMod[] calldata _payoutMod
    ) external;

    function contribute(
        uint256 _projectId,
        uint256[] memory _tiers,
        uint256[] memory _amounts,
        string memory _memo
    ) external payable;

    function communityContribute(
        uint256 _projectId,
        uint256 _fundingCycleId,
        string memory _memo
    ) external;

    function claimPassOrRefund(uint256 _projectId, uint256 _fundingCycleId) external;

    function tap(
        uint256 _projectId,
        uint256 _fundingCycleId,
        uint256 _amount
    ) external;

    function unLockTreasury(
        uint256 _projectId,
        uint256 _fundingCycleId,
        uint256 _unlockAmount
    ) external;
}
