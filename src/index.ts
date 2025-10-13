import { config } from "dotenv";
import { HederaOperator } from "./hedera.js";
import { Xtreamly } from "./xtreamly.js";
import { exit } from "process";
import { sendSignalToHedera } from "./oracle.js";

import fs from "fs";
config()

async function test() {
    // const xtreamly = new Xtreamly()
    // const res = await xtreamly.getIntervalLastSignal('ETH')
    // console.log(res)
    // exit()
    const hederaOpeator = new HederaOperator(
        process.env.HEDERA_TEST_ACCOUNT_ID,
        process.env.HEDERA_TEST_PRIVATE_KEY
    )

    try {

        // const res = await sendSignalToHedera('ETH')

        // const contractId = await hederaOpeator.createSmartContract(
        //     process.env.READ_NFT_SMARTCONTRACT_BYTECODE
        // )
        //

        // const res = await hederaOpeator.createSmartContract(
        //     process.env.READ_NFT_SMARTCONTRACT_BYTECODE
        // )
        // console.log(res)

        // const res = await hederaOpeator.callNFTSmartContract(
        //     process.env.TEST_SMARTCONTRACT_EVM_ADDRESS,
        //     process.env.NFT_COLLECTION_EVM_ADDRESS,
        //     parseInt(process.env.NFT_SERIAL_NUMBER)
        // )
        // console.log(res)
        //
        //

        const abi = JSON.parse(fs.readFileSync("./src/abi.json", "utf8"));
        // console.log(abi)


        const res = await hederaOpeator.getContractLogs(
            '0.0.6976324@1760382627.132397476',
            abi
        )
        console.log(res.length)

        // const tokenId = process.env.NFT_COLLECTION_TOKEN_ID
        // const nftSerialNumber = parseInt(process.env.NFT_SERIAL_NUMBER)
        //
        // const res = await hederaOpeator.updateNFTMetadata(
        //     tokenId,
        //     nftSerialNumber,
        //     {
        //         'timestamp': new Date().toISOString(),
        //         'signal': 'short',
        //     }
        // )
        // console.log(res)

    } catch (error) {
        console.error(error);
    } finally {
        hederaOpeator.close()
    }
}

test()
