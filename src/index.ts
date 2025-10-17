import { config } from "dotenv";
import { HederaOperator } from "./hedera.js";
config()

async function test() {
    const hederaOpeator = new HederaOperator(
        // process.env.HEDERA_ACCOUNT_ID,
        // process.env.HEDERA_PRIVATE_KEY
        process.env.HEDERA_TEST_ACCOUNT_ID,
        process.env.HEDERA_TEST_PRIVATE_KEY,
        true,
    )

    try {

        // await hederaOpeator.swap(
        //     process.env.USDC_TOKEN_ID,
        //     process.env.WETH_TOKEN_ID,
        //     (1 * 1_000_000),
        //     1500,
        // )

        // await hederaOpeator.createNFTCollection('Xtreamly Trading Signal', 'XTS')

        // await hederaOpeator.createNFT(
        //     process.env.NFT_COLLECTION_TOKEN_ID,
        //     ['uint8', 'uint8', 'uint64'],
        //     [1, 1, 1760540481]
        // )

        // const res = await sendSignalToHedera('ETH')
        // console.log(res)

        // const contractId = await hederaOpeator.createSmartContract(
        //     process.env.TEST_SMARTCONTRACT_BYTECODE
        // )
        // console.log(contractId)

        // const res = await hederaOpeator.callAssociateSmartContract(
        //     process.env.TEST_SMARTCONTRACT_ID,
        //     process.env.SAMPLE_TESTNET_TOKEN_ID,
        // )
        // console.log(res)

        const res = await hederaOpeator.callApproveSmartContract(
            process.env.TEST_SMARTCONTRACT_ID,
            process.env.SAMPLE_TESTNET_TOKEN_ID,
            process.env.SAUCERSWAP_ROUTER_TESTNET_ID,
            100_000_000,
        )
        console.log(res)

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
        //
        // const abi = JSON.parse(fs.readFileSync("./src/abi.json", "utf8"));
        // const res = await hederaOpeator.getContractLogs(
        //     '0.0.6976324@1760382627.132397476',
        //     abi
        // )
        // console.log(res.length)

    } catch (error) {
        console.error(error);
    } finally {
        hederaOpeator.close()
    }
}

test()
