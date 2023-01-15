import {
  DAOManager,
  DAOMembership,
  DAOGovernor,
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

describe("DAOMembership", function () {
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
    user1 = _user1;
  });

  it("DAO membership mint", async function () {
    const DAOManager = await ethers.getContractFactory("DAOManager", {
      libraries: {
        DAOFundingFactory: daoFundingFactoryAddr,
        DAOGovernorFactory: daoGovernorFactoryAddr,
        DAOMembershipFactory: daoMembershipFactoryAddr,
        DAOVotesFactory: daoVotesFactoryAddr,
      },
    });
    const daoManager = await DAOManager.deploy("ipfs://daoMetadata");

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

    await daoMembershipContract
      .connect(creator1)
      .mintPassForMember(user1.address, 1);

    //Expect the tier token to be transferred
    expect(await daoMembershipContract.balanceOf(user1.address, 1)).to.equal(1);
    //Expect the aggregate reputation to be initialized
    expect(
      await daoManager
        .connect(creator1)
        .getAggregateReputation(user1.address, [1])
    ).to.equal(0);
  });
});
