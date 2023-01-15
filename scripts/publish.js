// MIT License

// Copyright (c) Austin Griffith 2021
// Copyright (c) Neighborhood 2022

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const fs = require("fs");
const chalk = require("chalk");

const graphDir = "./neighborhood-subgraph";
const deploymentsDir = "./deployments";
const publishDir = "./neighborhood-fe/src/contracts";
const { Artifact } = require("hardhat/types");
const path = require("path");

function publishContract(contractName, networkName) {
  try {
    let contract = fs
      .readFileSync(`${deploymentsDir}/${networkName}/${contractName}.json`)
      .toString();
    contract = JSON.parse(contract);
    const graphConfigPath = `${graphDir}/config/config.json`;
    let graphConfig;
    try {
      if (fs.existsSync(graphConfigPath)) {
        graphConfig = fs.readFileSync(graphConfigPath).toString();
      } else {
        graphConfig = "{}";
      }
    } catch (e) {
      console.log(e);
    }

    graphConfig = JSON.parse(graphConfig);
    graphConfig[`${networkName}_${contractName}Address`] = contract.address;

    const folderPath = graphConfigPath.replace("/config.json", "");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    fs.writeFileSync(graphConfigPath, JSON.stringify(graphConfig, null, 2));
    if (!fs.existsSync(`${graphDir}/abis`)) fs.mkdirSync(`${graphDir}/abis`);
    fs.writeFileSync(
      `${graphDir}/abis/${networkName}_${contractName}.json`,
      JSON.stringify(contract.abi, null, 2)
    );

    //Hardhat Deploy writes a file with all ABIs in react-app/src/contracts/contracts.json
    //If you need the bytecodes and/or you want one file per ABIs, un-comment the following block.
    //Write the contracts ABI, address and bytecodes in case the front-end needs them
    fs.writeFileSync(
      `${publishDir}/${contractName}.address.js`,
      `module.exports = "${contract.address}";`
    );
    fs.writeFileSync(
      `${publishDir}/${contractName}.abi.js`,
      `module.exports = ${JSON.stringify(contract.abi, null, 2)};`
    );
    // fs.writeFileSync(
    //   `${publishDir}/${contractName}.bytecode.js`,
    //   `module.exports = "${contract.bytecode}";`
    // );

    return true;
  } catch (e) {
    console.log(
      "Failed to publish " + chalk.red(contractName) + " to the subgraph."
    );
    console.log(e);
    return false;
  }
}

async function main() {
  const directories = fs.readdirSync(deploymentsDir);
  directories.forEach(function (directory) {
    const files = fs.readdirSync(`${deploymentsDir}/${directory}`);
    files.forEach(function (file) {
      if (file.indexOf(".json") >= 0) {
        const contractName = file.replace(".json", "");
        publishContract(contractName, directory);
      }
    });
  });
  console.log("✅  Published contracts to the subgraph package.");
  const artifactPaths = await hre.artifacts.getArtifactPaths();
  for (const artifactPath of artifactPaths) {
    //Do not copy 3rd party contract ABIs
    if (!artifactPath.includes("artifacts/contracts")) continue;
    //Factory libraries are already deployed and ABIs are exported
    if (artifactPath.includes("Factory")) continue;
    //DAOManager is already deployed and the ABI is exported
    if (artifactPath.includes("DAOManager")) continue;

    try {
      let contract = fs.readFileSync(artifactPath).toString();
      const artifact = JSON.parse(contract);

      if (!fs.existsSync(`${graphDir}/abis`)) fs.mkdirSync(`${graphDir}/abis`);
      if (!fs.existsSync(publishDir)) fs.mkdirSync(publishDir);
      const artifactName = path.basename(artifactPath, ".json");
      fs.writeFileSync(
        `${graphDir}/abis/${artifactName}.json`,
        JSON.stringify(artifact.abi, null, 2)
      );
      fs.writeFileSync(
        `${publishDir}/${artifactName}.json`,
        JSON.stringify(artifact.abi, null, 2)
      );
    } catch (e) {
      console.log("Failed to publish " + artifactPath + " to the subgraph.");
      console.log(e);
      return false;
    }
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
