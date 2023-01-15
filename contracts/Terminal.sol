// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@prb/math/contracts/PRBMath.sol";

import {ITerminal, IProjects, IFundingCycles, IMembershipPassBooth, IDAOGovernorBooster, IBluechipsBooster, ITerminalDirectory, IPayoutStore, FundingCycleState, Metadata, ImmutablePassTier, FundingCycleParameter, AuctionedPass, FundingCycleProperties, PayInfoWithWeight, IERC721, PayoutMod} from "./interfaces/ITerminal.sol";

contract Terminal is ITerminal, Initializable, ReentrancyGuardUpgradeable {
    using SafeMath for uint256;

    /*╔═════════════════════════════╗
      ║  Private Stored Properties  ║
      ╚═════════════════════════════╝*/
    address public override superAdmin;

    // The percent fee takes when from tapped amounts, 1 => 1%
    uint256 public override tapFee;

    // The percent fee takes when user contribute to a project, 1 => 0.1%
    uint256 public override contributeFee;

    // The dev treasury address
    address public override devTreasury;

    // The min lock percent of funds in treasury. 3000 => 30%
    uint256 public override minLockRate;

    // the amount of ETH that each project is responsible for.
    mapping(uint256 => uint256) public override balanceOf;

    IProjects public override projects;

    IFundingCycles public override fundingCycles;

    IMembershipPassBooth public override membershipPassBooth;

    IDAOGovernorBooster public override daoGovernorBooster;

    IBluechipsBooster public override bluechipsBooster;

    ITerminalDirectory public override terminalDirectory;

    IPayoutStore public override payoutStore;

    modifier onlyAdmin() {
        if (msg.sender != superAdmin) revert UnAuthorized();
        _;
    }

    modifier onlyProjectFundingCycleMatch(uint256 _projectId, uint256 _fundingCycleId) {
        FundingCycleProperties memory _fundingCycle = fundingCycles.getFundingCycle(
            _fundingCycleId
        );
        if (_projectId == 0 || _fundingCycle.projectId != _projectId) revert FundingCycleNotExist();
        _;
    }

    modifier onlyCorrectPeroid(uint256 _fundingCycleId, FundingCycleState _expectState) {
        if (fundingCycles.getFundingCycleState(_fundingCycleId) != _expectState)
            revert BadOperationPeriod();
        _;
    }

    /*╔══════════════════════════╗
      ║  External / Public VIEW  ║
      ╚══════════════════════════╝*/
    /**
		@notice
		Get offering tickets by funding cycle

		@param _from The wallet address of the user 
		@param _projectId The ID of the DAO you contributed with
		@param _fundingCycleId The ID of the funding cycle
		@return amounts The amount of each tier Passes offering in this funding cycle
		@return allocations The allocation percentage of each tier Passes offering in this funding cycle
	*/
    function getOfferingAmount(
        address _from,
        uint256 _projectId,
        uint256 _fundingCycleId
    ) public view returns (uint256[] memory amounts, uint256[] memory allocations) {
        allocations = membershipPassBooth.getUserAllocation(_from, _projectId, _fundingCycleId);

        amounts = new uint256[](allocations.length);
        for (uint256 i; i < allocations.length;) {
            if (allocations[i] == 0) {
                amounts[i] = 0;
                continue;
            }
            amounts[i] = allocations[i]
                .mul(fundingCycles.getAutionedPass(_fundingCycleId, i).saleAmount)
                .div(1e6);
            unchecked {
                i++;
            }
        }
    }

    /**
		@notice
		Estimate allocate tickets

		@param _projectId The ID of the DAO
		@param _fundingCycleId The ID of the funding cycle
		@param _payData payment info
	*/
    function getEstimatingAmount(
        uint256 _projectId,
        uint256 _fundingCycleId,
        uint256[] memory _payData
    ) external view returns (uint256[] memory amounts, uint256[] memory allocations) {
        uint256[] memory _weights = new uint256[](_payData.length);
        for (uint256 i; i < _payData.length;) {
            _weights[i] = _payData[i] * fundingCycles.getAutionedPass(_fundingCycleId, i).salePrice;
            unchecked {
                i++;
            }
        }
        allocations = membershipPassBooth.getEstimatingUserAllocation(
            _projectId,
            _fundingCycleId,
            _payData,
            _weights
        );
        for (uint256 i; i < allocations.length;) {
            amounts[i] = allocations[i]
                .mul(fundingCycles.getAutionedPass(_fundingCycleId, i).saleAmount)
                .div(1e6);
            unchecked {
                i++;
            }
        }
    }

    /**
		@notice
		Get offering tickets by funding cycle

		@param _from user address
		@param _projectId the project id of contribute dao
		@param _fundingCycleId the funding cycle id
	*/
    function getRefundingAmount(
        address _from,
        uint256 _projectId,
        uint256 _fundingCycleId
    ) public view returns (uint256 amount) {
        (uint256[] memory _offeringAmounts, ) = getOfferingAmount(
            _from,
            _projectId,
            _fundingCycleId
        );
        for (uint256 i; i < _offeringAmounts.length;) {
            (uint256 _amount, ) = membershipPassBooth.depositedWeightBy(_from, _fundingCycleId, i);
            if (_amount == 0) continue;
            amount += _amount.sub(_offeringAmounts[i]).mul(
                fundingCycles.getAutionedPass(_fundingCycleId, i).salePrice
            );
            unchecked {
                i++;
            }
        }
    }

    /**
		@notice
		Calculate the unsold tickets by funding cycle id

		@param _fundingCycleId the funding cycle id
	*/
    function getUnSoldTickets(uint256 _fundingCycleId) public view returns (uint256) {}

    /*╔═════════════════════════════╗
      ║   CONTRACT SETUP  ║
      ╚═════════════════════════════╝*/
    /**
		@notice
		Due to a requirement of the proxy-based upgradeability system, no constructors can be used in upgradeable contracts
	    
		@param _projects A DAO's contract which mints ERC721 represent project's ownership and transfers.
		@param _fundingCycles A funding cycle configuration store. (DAO Creator can launch mutiple times.)
		@param _passBooth The tiers with the Membership-pass this DAO has
		@param _governorBooster The governor booster
		@param _devTreasury dev treasury address, receive contribute fee and tap fee
		@param _admin super admin
	 */
    function initialize(
        IProjects _projects,
        IFundingCycles _fundingCycles,
        IMembershipPassBooth _passBooth,
        IDAOGovernorBooster _governorBooster,
        ITerminalDirectory _terminalDirectory,
        IBluechipsBooster _bluechipsBooster,
        IPayoutStore _payoutStore,
        address _devTreasury,
        address _admin
    ) public initializer {
        if (
            _projects == IProjects(address(0)) ||
            _fundingCycles == IFundingCycles(address(0)) ||
            _passBooth == IMembershipPassBooth(address(0)) ||
            _governorBooster == IDAOGovernorBooster(address(0)) ||
            _terminalDirectory == ITerminalDirectory(address(0)) ||
            _bluechipsBooster == IBluechipsBooster(address(0)) ||
            _payoutStore == IPayoutStore(address(0)) ||
            _devTreasury == address(0) ||
            _admin == address(0)
        ) revert ZeroAddress();

        __ReentrancyGuard_init();
        projects = _projects;
        fundingCycles = _fundingCycles;
        membershipPassBooth = _passBooth;
        daoGovernorBooster = _governorBooster;
        terminalDirectory = _terminalDirectory;
        bluechipsBooster = _bluechipsBooster;
        devTreasury = _devTreasury;
        payoutStore = _payoutStore;
        superAdmin = _admin;
        contributeFee = 1;
        tapFee = 4;
        minLockRate = 5000;
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/
    /**
		@notice
		Deploy a DAO, this will mint an ERC721 into the `_owner`'s account, and configure a first funding cycle.

        @param _metadata The metadata for the DAO
    	@param _tiers The total tiers of the Membership-pass
		@param _params The parameters for Funding Cycle 
		@param _auctionedPass Auctioned pass information
        @param _payoutMods The payout infos
	 */
    function createDao(
        Metadata calldata _metadata,
        ImmutablePassTier[] calldata _tiers,
        FundingCycleParameter calldata _params,
        AuctionedPass[] calldata _auctionedPass,
        PayoutMod[] calldata _payoutMods
    ) external override {
        _validateConfigProperties(_auctionedPass, _params);

        uint256 _projectId = projects.create(msg.sender, _metadata.handle, this);
        _setupProject(_projectId, _metadata, _tiers, _auctionedPass);

        FundingCycleProperties memory fundingCycleProperty = fundingCycles.configure(
            _projectId,
            _params,
            _auctionedPass
        );
        payoutStore.setPayoutMods(_projectId, fundingCycleProperty.id, _payoutMods);
    }

    /**
		@notice
		Create the new Funding Cycle for spesific project, need to check the reserve amount pass in Treasury

		@param _projectId The project id of the dao
		@param _params The parameters for funding cycle
		@param _auctionedPass auctioned pass information
	 */
    function createNewFundingCycle(
        uint256 _projectId,
        FundingCycleParameter calldata _params,
        AuctionedPass[] calldata _auctionedPass,
        PayoutMod[] calldata _payoutMods
    ) external override {
        if (msg.sender != projects.ownerOf(_projectId)) revert UnAuthorized();

        _validateConfigProperties(_auctionedPass, _params);

        uint256 latestFundingCycleId = fundingCycles.latestIdFundingProject(_projectId);

        FundingCycleProperties memory property = fundingCycles.configure(
            _projectId,
            _params,
            _auctionedPass
        );

        if (property.id == latestFundingCycleId) revert FundingCycleActived();
        payoutStore.setPayoutMods(_projectId, property.id, _payoutMods);
    }

    /**
		@notice
		Contribute ETH to a dao

		@param _projectId The ID of the DAO being contribute to
		@param _tiers The payment tier ids
		@param _amounts The amounts of submitted
		@param _memo The memo that will be attached in the published event after purchasing
	 */
    function contribute(
        uint256 _projectId,
        uint256[] memory _tiers,
        uint256[] memory _amounts,
        string memory _memo
    ) external payable override {
        FundingCycleProperties memory _fundingCycle = fundingCycles.currentOf(_projectId);
        uint256 _fundingCycleId = _fundingCycle.id;
        if (_fundingCycleId == 0) revert FundingCycleNotExist();
        if (fundingCycles.getFundingCycleState(_fundingCycleId) != FundingCycleState.Active)
            revert BadOperationPeriod();

        // Make sure its not paused.
        if (_fundingCycle.isPaused) revert FundingCyclePaused();
        if (_tiers.length != _amounts.length) revert BadPayment();

        uint256 _amount;
        PayInfoWithWeight[] memory _payInfoWithWeights = new PayInfoWithWeight[](_tiers.length);
        for (uint256 i; i < _tiers.length;) {
            AuctionedPass memory _auctionedPass = fundingCycles.getAutionedPass(
                _fundingCycleId,
                _tiers[i]
            );
            _amount = _amount.add(_amounts[i].mul(_auctionedPass.salePrice));
            _payInfoWithWeights[i] = PayInfoWithWeight({
                tier: _tiers[i],
                amount: _amounts[i],
                weight: _auctionedPass.salePrice
            });
            unchecked {
                i++;
            }
        }
        // contribute fee amount
        uint256 feeAmount = _amount.mul(contributeFee.div(100));
        if (msg.value < _amount.add(feeAmount)) revert InsufficientBalance();

        // update tappable and locked balance
        fundingCycles.updateLocked(_projectId, _fundingCycleId, _amount);

        // Transfer fee to the dev address
        AddressUpgradeable.sendValue(payable(devTreasury), feeAmount);

        // Add to the balance of the project.
        balanceOf[_projectId] += _amount;

        address _beneficiary = msg.sender;
        membershipPassBooth.stake(_projectId, _fundingCycleId, _beneficiary, _payInfoWithWeights);

        emit Pay(_projectId, _fundingCycleId, _beneficiary, _amount, _tiers, _amounts, _memo);
    }

    /**
		@notice
		Community members can mint the  membership pass for free. For those who has the specific NFT in wallet, enable to claim free pass

		@param _projectId The ID of the DAO being contribute to
		@param _fundingCycleId The funding cycle id
		@param _memo memo attached when purchase
	 */
    function communityContribute(
        uint256 _projectId,
        uint256 _fundingCycleId,
        string memory _memo
    ) external override onlyProjectFundingCycleMatch(_projectId, _fundingCycleId) {
        address _beneficiary = msg.sender;
        if (membershipPassBooth.airdropClaimedOf(_beneficiary, _fundingCycleId))
            revert AlreadyClaimed();

        uint256 tierSize = membershipPassBooth.tierSizeOf(_projectId);
        uint256[] memory _tiers = new uint256[](tierSize);
        uint256[] memory _amounts = new uint256[](tierSize);
        for (uint256 i; i < tierSize;) {
            AuctionedPass memory _auctionedPass = fundingCycles.getAutionedPass(_fundingCycleId, i);
            _tiers[i] = _auctionedPass.id;
            _amounts[i] = 0;
            if (
                IERC721(_auctionedPass.communityVoucher).balanceOf(_beneficiary) > 0 &&
                _auctionedPass.communityAmount -
                    membershipPassBooth.airdropClaimedAmountOf(_fundingCycleId, _auctionedPass.id) >
                0
            ) {
                _amounts[i] = 1;
            }
            unchecked {
                i++;
            }
        }

        if (_tiers.length == 0) revert NoCommunityTicketLeft();

        membershipPassBooth.airdropBatchMintTicket(
            _projectId,
            _fundingCycleId,
            _beneficiary,
            _tiers,
            _amounts
        );

        emit Airdrop(_projectId, _fundingCycleId, _beneficiary, _tiers, _amounts, _memo);
    }

    /**
		@notice
		Claim menbershippass or refund overlow part

		@param _projectId the project id to claim
		@param _fundingCycleId the funding cycle id to claim
	 */
    function claimPassOrRefund(uint256 _projectId, uint256 _fundingCycleId)
        external
        override
        nonReentrant
        onlyProjectFundingCycleMatch(_projectId, _fundingCycleId)
        onlyCorrectPeroid(_fundingCycleId, FundingCycleState.Expired)
    {
        address _from = msg.sender;
        if (membershipPassBooth.claimedOf(_from, _fundingCycleId)) revert AlreadyClaimed();

        uint256 _refundAmount = getRefundingAmount(_from, _projectId, _fundingCycleId);
        if (_refundAmount > 0) {
            if (balanceOf[_projectId] < _refundAmount) revert InsufficientBalance();
            balanceOf[_projectId] = balanceOf[_projectId] - _refundAmount;
            AddressUpgradeable.sendValue(payable(_from), _refundAmount);
        }
        (uint256[] memory _offeringAmounts, ) = getOfferingAmount(
            _from,
            _projectId,
            _fundingCycleId
        );
        membershipPassBooth.batchMintTicket(_projectId, _fundingCycleId, _from, _offeringAmounts);

        emit Claim(_projectId, _fundingCycleId, _from, _refundAmount, _offeringAmounts);
    }

    /**
		@notice
		Tap into funds that have been contributed to a project's funding cycles

		@param _projectId The ID of the project to which the funding cycle being tapped belongs
		@param _fundingCycleId The ID of the funding cycle to tap
		@param _amount The amount being tapped
	 */
    function tap(
        uint256 _projectId,
        uint256 _fundingCycleId,
        uint256 _amount
    )
        external
        override
        nonReentrant
        onlyProjectFundingCycleMatch(_projectId, _fundingCycleId)
        onlyCorrectPeroid(_fundingCycleId, FundingCycleState.Expired)
    {
        if (msg.sender != projects.ownerOf(_projectId)) revert UnAuthorized();
        if (fundingCycles.getFundingCycleState(_fundingCycleId) != FundingCycleState.Expired)
            revert BadOperationPeriod();

        // get a reference to this project's current balance, including any earned yield.
        uint256 _balance = balanceOf[_projectId];
        if (_amount > _balance) revert InsufficientBalance();

        // register the funds as tapped. Get the ID of the funding cycle that was tapped.
        fundingCycles.tap(_projectId, _fundingCycleId, _amount);

        // removed the tapped funds from the project's balance.
        balanceOf[_projectId] = _balance - _amount;

        uint256 _feeAmount = _amount.mul(tapFee).div(100);
        uint256 _tappableAmount = _amount.sub(_feeAmount);
        AddressUpgradeable.sendValue(payable(devTreasury), _feeAmount);

        uint256 _leftoverTransferAmount = _distributeToPayoutMods(
            _projectId,
            _fundingCycleId,
            _tappableAmount
        );
        address payable _projectOwner = payable(projects.ownerOf(_projectId));

        if (_leftoverTransferAmount > 0) {
            AddressUpgradeable.sendValue(_projectOwner, _leftoverTransferAmount);
        }

        emit Tap(_projectId, _fundingCycleId, msg.sender, _feeAmount, _tappableAmount);
    }

    /**
		@notice
		Unlock the locked balance in dao treasury

		@dev
		Only daoGovernor contract

		@param _projectId The Id of the project to unlock
		@param _fundingCycleId The Id of the fundingCycle to unlock
		@param _unlockAmount The amount being unlocked
	 */
    function unLockTreasury(
        uint256 _projectId,
        uint256 _fundingCycleId,
        uint256 _unlockAmount
    )
        external
        override
        onlyProjectFundingCycleMatch(_projectId, _fundingCycleId)
        onlyCorrectPeroid(_fundingCycleId, FundingCycleState.Expired)
    {
        if (msg.sender != address(daoGovernorBooster)) revert OnlyGovernor();

        fundingCycles.unlock(_projectId, _fundingCycleId, _unlockAmount);

        emit UnlockTreasury(_projectId, _unlockAmount);
    }

    /**
        @notice
        Set paused status to the current active funding cycle in the spesific project.

        @param _projectId The ID of the project to which the funds received belong.
        @param _paused status true or false for the funding cycle.
     */
    function setPausedFundingCycleProject(uint256 _projectId, bool _paused)
        external
        returns (bool)
    {
        if (msg.sender != projects.ownerOf(_projectId) && msg.sender != superAdmin)
            revert UnAuthorized();

        return fundingCycles.setPauseFundingCycle(_projectId, _paused);
    }

    function setTapFee(uint256 _fee) external override onlyAdmin {
        if (_fee > 10) revert BadTapFee();

        tapFee = _fee;

        emit SetTapFee(_fee);
    }

    function setContributeFee(uint256 _fee) external override onlyAdmin {
        contributeFee = _fee;

        emit SetContributeFee(_fee);
    }

    function setMinLockRate(uint256 _minLockRate) external override onlyAdmin {
        minLockRate = _minLockRate;

        emit SetMinLockRate(_minLockRate);
    }

    /**
        @notice
        Receives and allocates funds belonging to the specified project.

        @param _projectId The ID of the project to which the funds received belong.
     */
    function addToBalance(uint256 _projectId) external payable override {
        // The amount must be positive.
        if (msg.value <= 0) revert BadAmount();
        balanceOf[_projectId] = balanceOf[_projectId] + msg.value;
        emit AddToBalance(_projectId, msg.value, msg.sender);
    }

    /*╔═════════════════════════════╗
      ║   Private Helper Functions  ║
      ╚═════════════════════════════╝*/
    /**
		@notice
		Validate the Config Setting For Passes For The Fundraising this time

		@param _auctionedPasses The ID of the funding cycle
	 */
    function _validateConfigProperties(
        AuctionedPass[] calldata _auctionedPasses,
        FundingCycleParameter calldata _params
    ) private view {
        for (uint256 i; i < _auctionedPasses.length;) {
            if (
                _auctionedPasses[i].communityVoucher != address(0) &&
                !IERC721(_auctionedPasses[i].communityVoucher).supportsInterface(0x80ac58cd)
            ) revert Voucher721(_auctionedPasses[i].communityVoucher);
            unchecked {
                i++;
            }
        }

        if (_params.lockRate < minLockRate) revert BadLockRate();
    }

    /** 
      @notice
      Pays out the mods for the specified funding cycle.
      @param _projectId The project id base the distribution on.
      @param _fundingCycleId The funding cycle id to base the distribution on.
      @param _amount The total amount being paid out.
      @return leftoverAmount If the mod percents dont add up to 100%, the leftover amount is returned.
    */
    function _distributeToPayoutMods(
        uint256 _projectId,
        uint256 _fundingCycleId,
        uint256 _amount
    ) private returns (uint256 leftoverAmount) {
        // Set the leftover amount to the initial amount.
        leftoverAmount = _amount;

        // Get a reference to the project's payout mods.
        PayoutMod[] memory _mods = payoutStore.payoutModsOf(_fundingCycleId);

        if (_mods.length == 0) return leftoverAmount;

        //Transfer between all mods.
        for (uint256 _i; _i < _mods.length;) {
            // Get a reference to the mod being iterated on.
            PayoutMod memory _mod = _mods[_i];

            // The amount to send towards mods. Mods percents are out of 10000.
            uint256 _modCut = PRBMath.mulDiv(_amount, _mod.percent, 10000);

            if (_modCut > 0) {
                AddressUpgradeable.sendValue(_mod.beneficiary, _modCut);
            }

            // Subtract from the amount to be sent to the beneficiary.
            leftoverAmount = leftoverAmount - _modCut;

            unchecked {
                _i++;
            }

            emit DistributeToPayoutMod(_fundingCycleId, _projectId, _mod, _modCut, msg.sender);
        }
    }

    function _setupProject(
        uint256 _projectId,
        Metadata calldata _metadata,
        ImmutablePassTier[] calldata _tiers,
        AuctionedPass[] calldata _auctionedPass
    ) internal {
        uint256[] memory _tierFee = new uint256[](_tiers.length);
        uint256[] memory _tierCapacity = new uint256[](_tiers.length);
        uint256[] memory _multipliers = new uint256[](_tiers.length);

        for (uint256 i; i < _tiers.length;) {
            if (
                (_auctionedPass[i].saleAmount +
                    _auctionedPass[i].communityAmount +
                    _auctionedPass[i].reservedAmount) > _tiers[i].tierCapacity
            ) {
                revert InsufficientBalance();
            }
            _tierFee[i] = _tiers[i].tierFee;
            _tierCapacity[i] = _tiers[i].tierCapacity;
            _multipliers[i] = _tiers[i].multiplier;
            unchecked {
                i++;
            }
        }

        address membershipPass = membershipPassBooth.issue(
            _projectId,
            _tierFee,
            _tierCapacity,
            _multipliers
        );

        daoGovernorBooster.createGovernor(_projectId, _multipliers, membershipPass, superAdmin);

        if (_metadata.customBoosters.length > 0)
            bluechipsBooster.createCustomBooster(
                _projectId,
                _metadata.customBoosters,
                _metadata.boosterMultipliers
            );
    }
}
