import {
  DAOManager,
  DAOMembership,
  DAOGovernor,
  DAOVotes,
  FundingRoundConfig,
  Ownable,
} from "../typechain";
import { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let accounts: SignerWithAddress[] = [];
let creator1: SignerWithAddress;
let creator2: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let daoFundingFactoryAddr: string;
let daoGovernorFactoryAddr: string;
let daoMembershipFactoryAddr: string;
let daoVotesFactoryAddr: string;

describe("DAOManager", function () {
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
    accounts = await ethers.getSigners();
    const [_creator1, _creator2, _user1, _user2] = accounts;
    creator1 = _creator1;
  });

  it("DAO creator is the owner of all DAO config contracts", async function () {
    const DAOManager = await ethers.getContractFactory("DAOManager", {
      libraries: {
        DAOFundingFactory: daoFundingFactoryAddr,
        DAOGovernorFactory: daoGovernorFactoryAddr,
        DAOMembershipFactory: daoMembershipFactoryAddr,
        DAOVotesFactory: daoVotesFactoryAddr,
      },
    });
    const daoManager = await DAOManager.deploy("ipfs://daoMetadata");

    // string memory daoName,
    //     string memory membershipTokenUri,
    //     uint256[] memory tierCapacity,
    //     uint256[] memory tierReserve,
    //     uint256[] memory tierReputationMultiplier,
    //     address[] memory baseNFTAddresses
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

    const firstDaoConfig = await daoManager.daoConfigs(1);
    const daoMembership = await ethers.getContractFactory("DAOMembership");
    const daoMembershipContract = (await daoMembership.attach(
      firstDaoConfig.membershipContract
    )) as DAOMembership;
    const daoGovernance = await ethers.getContractFactory("DAOGovernor");
    const daoGovernanceContract = (await daoGovernance.attach(
      firstDaoConfig.governanceContract
    )) as DAOGovernor;
    const fundingRound = await ethers.getContractFactory("FundingRoundConfig");
    const fundingRoundContract = (await fundingRound.attach(
      firstDaoConfig.fundingContract
    )) as FundingRoundConfig;
    const daoVotes = await ethers.getContractFactory("DAOVotes");
    const daoVotesContract = (await daoVotes.attach(
      firstDaoConfig.fundingContract
    )) as DAOVotes;
    expect(await daoMembershipContract.owner()).to.equal(creator1.address);
    expect(await fundingRoundContract.owner()).to.equal(creator1.address);
    expect(await daoGovernanceContract.owner()).to.equal(creator1.address);
    expect(await daoVotesContract.owner()).to.equal(creator1.address);
  });
});
