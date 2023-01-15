import {
  DAOManager,
  DAOMembership,
  DAOGovernor,
  FundingRoundConfig,
  Ownable,
} from "../typechain";
import { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { customError } from "./test-utils/custom-error-helper";

let accounts: SignerWithAddress[] = [];
let creator1: SignerWithAddress;
let creator2: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let daoFundingFactoryAddr: string;
let daoGovernorFactoryAddr: string;
let daoMembershipFactoryAddr: string;
let daoVotesFactoryAddr: string;
let daoManager: DAOManager;
const SECONDS_IN_DAY = 86400;
const ROUND_DURATION = SECONDS_IN_DAY * 7;
let fundingRoundEnd: BigNumber;

describe("Fundraising Round", function () {
  const provider = waffle.provider;
  this.beforeAll("Set accounts", async () => {
    const DAOFundingFactory = await ethers.getContractFactory(
      "DAOFundingFactory"
    );
    daoFundingFactoryAddr = await (await DAOFundingFactory.deploy()).address;
    const DAOGovernorFactory = await ethers.getContractFactory(
      "DAOGovernorFactory"
    );
    daoGovernorFactoryAddr = await (await DAOGovernorFactory.deploy()).address;
    const DAOMembershipFactory = await ethers.getContractFactory(
      "DAOMembershipFactory"
    );
    daoMembershipFactoryAddr = await (
      await DAOMembershipFactory.deploy()
    ).address;
    const DAOVotesFactory = await ethers.getContractFactory("DAOVotesFactory");
    daoVotesFactoryAddr = await (await DAOVotesFactory.deploy()).address;
    const DAOManager = await ethers.getContractFactory("DAOManager", {
      libraries: {
        DAOFundingFactory: daoFundingFactoryAddr,
        DAOGovernorFactory: daoGovernorFactoryAddr,
        DAOMembershipFactory: daoMembershipFactoryAddr,
        DAOVotesFactory: daoVotesFactoryAddr,
      },
    });
    daoManager = await DAOManager.deploy("ipfs://daoMetadata");
    // string memory daoName,
    //     string memory membershipTokenUri,
    //     uint256[] memory tierCapacity,
    //     uint256[] memory tierReserve,
    //     uint256[] memory tierReputationMultiplier,
    //     address[] memory baseNFTAddresses
    accounts = await ethers.getSigners();
    const [_creator1, _creator2, _user1, _user2] = accounts;
    creator1 = _creator1;
    user1 = _user1;
    await daoManager
      .connect(creator1)
      .createDao(
        "MyNewDAO",
        "ipfs://daoTicketsMetadata",
        [10, 50, 100],
        [1, 5, 10],
        [3, 2, 1],
        []
      );
  });

  it("DAO creator can start the fundraising round", async function () {
    const firstDaoConfig = await daoManager.daoConfigs(1);
    const fundingRound = await ethers.getContractFactory("FundingRoundConfig");
    const fundingRoundContract = (await fundingRound.attach(
      firstDaoConfig.fundingContract
    )) as FundingRoundConfig;

    // uint256 duration,
    // uint256[] memory tierCapacity,
    // uint256[] memory _tierUnlockRate
    await fundingRoundContract
      .connect(creator1)
      .start(
        ROUND_DURATION,
        [10, 50, 100],
        [(1 * 10) ^ 18, (0.5 * 10) ^ 18, (0.1 * 10) ^ 18],
        [1, 1, 1]
      );
    expect(await fundingRoundContract.isActive()).to.equal(true);
    await expect(
      fundingRoundContract
        .connect(creator1)
        .start(
          ROUND_DURATION,
          [10, 50, 100],
          [(1 * 10) ^ 18, (0.5 * 10) ^ 18, (0.1 * 10) ^ 18],
          [1, 1, 1]
        )
    ).to.be.revertedWith(customError("ALREADY_ACTIVE"));
    await expect(
      fundingRoundContract
        .connect(user1)
        .start(
          ROUND_DURATION,
          [10, 50, 100],
          [(1 * 10) ^ 18, (0.5 * 10) ^ 18, (0.1 * 10) ^ 18],
          [1, 1, 1]
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    const blockNumber = await provider.getBlockNumber();
    const currentBlock = await provider.getBlock(blockNumber);
    const roundEnd = BigNumber.from(
      parseInt(currentBlock.timestamp.toString()) + ROUND_DURATION
    );

    await provider.send("evm_setNextBlockTimestamp", [roundEnd.toNumber() + 1]); // fast forward the duration of the fundraising round
    await provider.send("evm_mine", []);

    expect(await fundingRoundContract.isActive()).to.equal(false);
    //Restart the round
    await fundingRoundContract
      .connect(creator1)
      .start(
        ROUND_DURATION,
        [10, 50, 100],
        [(1 * 10) ^ 18, (0.5 * 10) ^ 18, (0.1 * 10) ^ 18],
        [1, 1, 1]
      );
    expect(await fundingRoundContract.isActive()).to.equal(true);
    //Wait until the round end
    const newBlockNumber = await provider.getBlockNumber();
    const newCurrentBlock = await provider.getBlock(newBlockNumber);
    const nextRoundEnd = BigNumber.from(
      parseInt(newCurrentBlock.timestamp.toString()) + ROUND_DURATION
    );
    await provider.send("evm_setNextBlockTimestamp", [
      nextRoundEnd.toNumber() + 1,
    ]); // fast forward the duration of the fundraising round
    await provider.send("evm_mine", []);
  });

  it("The fundraising round cannot be started with incorrect parameters", async function () {
    const firstDaoConfig = await daoManager.daoConfigs(1);
    const fundingRound = await ethers.getContractFactory("FundingRoundConfig");
    const fundingRoundContract = (await fundingRound.attach(
      firstDaoConfig.fundingContract
    )) as FundingRoundConfig;

    // uint256 duration,
    // uint256[] memory tierCapacity,
    // uint256[] memory _tierUnlockRate
    await expect(
      fundingRoundContract
        .connect(creator1)
        .start(
          ROUND_DURATION,
          [10, 50],
          [(1 * 10) ^ 18, (0.5 * 10) ^ 18, (0.1 * 10) ^ 18],
          [1, 1, 1]
        )
    ).to.be.revertedWith(customError("INVALID_TIER_CAPACITY"));
    await expect(
      fundingRoundContract
        .connect(creator1)
        .start(
          ROUND_DURATION,
          [10, 50, 100],
          [(1 * 10) ^ 18, (0.5 * 10) ^ 18, (0.1 * 10) ^ 18],
          [1, 1]
        )
    ).to.be.revertedWith(customError("INVALID_TIER_UNLOCK_RATE"));
    await expect(
      fundingRoundContract
        .connect(creator1)
        .start(
          ROUND_DURATION,
          [10, 50, 100],
          [(0.5 * 10) ^ 18, (0.1 * 10) ^ 18],
          [1, 1, 1]
        )
    ).to.be.revertedWith(customError("INVALID_TIER_PRICE"));
  });
});
