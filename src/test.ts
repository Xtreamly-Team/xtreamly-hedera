import { config } from "dotenv";
import { HederaOperator } from "./hedera.js";

config()

async function prepareSmartContract() {
    const hederaOpeator = new HederaOperator(
        process.env.HEDERA_ACCOUNT_ID,
        process.env.HEDERA_PRIVATE_KEY,
        // process.env.HEDERA_TEST_ACCOUNT_ID,
        // process.env.HEDERA_TEST_PRIVATE_KEY,
        false,
    )

    async function createSmartContract() {
        const contractId = await hederaOpeator.createSmartContract(
            process.env.SMARTCONTRACT_BYTECODE,
            process.env.ROUTER_ID,
            process.env.WETH_TOKEN_ID,
            process.env.USDC_TOKEN_ID,
            process.env.SIGNAL_NFT_COLLECTION_TOKEN_ID,
            parseInt(process.env.SIGNAL_NFT_SERIAL_NUMBER),
        )
        console.log(contractId)
    }

    async function firstTimeSetup() {
        await hederaOpeator.callAssociateSmartContract(
            process.env.SMARTCONTRACT_ID,
            process.env.USDC_TOKEN_ID,
        )

        await hederaOpeator.callAssociateSmartContract(
            process.env.SMARTCONTRACT_ID,
            process.env.WETH_TOKEN_ID,
        )
    }

    async function userFirstTimeSetup() {
        await hederaOpeator.approve(
            process.env.USDC_TOKEN_ID,
            process.env.SMARTCONTRACT_ID,
            1_000_000_000,
        )
        await hederaOpeator.approve(
            process.env.WETH_TOKEN_ID,
            process.env.SMARTCONTRACT_ID,
            1_000_000_000,
        )
    }

    async function swap(
        tokenIn: string,
        tokenOut: string,
        amount: number,
        fee: number = 1500,
    ) {
        await hederaOpeator.callSwapInSmartContract(
            process.env.SMARTCONTRACT_ID,
            tokenIn,
            tokenOut,
            fee,
            amount,
        )
    }

    async function readSignal() {
        await hederaOpeator.callReadNFTSignal(
            process.env.SMARTCONTRACT_ID,
        )
    }

    async function autoTrade() {
        await hederaOpeator.callAutoTradeInSmartContract(
            process.env.SMARTCONTRACT_ID,
            5_000_000,
            500_000
        )
    }

    try {

        // await createSmartContract()
        // await firstTimeSetup()
        // await userFirstTimeSetup()
        //
        // await readSignal()

        // await autoTrade()

        await hederaOpeator.updateNFTMetadata(
            process.env.SIGNAL_NFT_COLLECTION_TOKEN_ID,
            parseInt(process.env.SIGNAL_NFT_SERIAL_NUMBER),
            ['uint8', 'uint8', 'uint64'],
            [1, 1, 1760740161]
        )

        // await swap(
        //     process.env.USDC_TOKEN_ID,
        //     process.env.WETH_TOKEN_ID,
        //     1_000_000,
        // )

        // await readSignal()


    } catch (error) {
        console.error(error);
    } finally {
        hederaOpeator.close()
    }


}


// prepareSmartContract()


async function test() {
    const hederaOpeator = new HederaOperator(
        // process.env.HEDERA_ACCOUNT_ID,
        // process.env.HEDERA_PRIVATE_KEY,
        process.env.HEDERA_TESTNET_ACCOUNT_ID,
        process.env.HEDERA_TESTNET_PRIVATE_KEY,
        true
    )

    try {

        // const contractId = await hederaOpeator.createSmartContract(
        //     process.env.SMARTCONTRACT_TESTNET_BYTECODE,
        //     process.env.ROUTER_TESTNET_ID,
        // )
        // console.log(contractId)

        // await hederaOpeator.callAssociateSmartContract(
        //     process.env.SMARTCONTRACT_TESTNET_ID,
        //     process.env.TEST_TOKEN_TESTNET_ID,
        // )
        //
        // await hederaOpeator.callApproveToRouterSmartContract(
        //     process.env.SMARTCONTRACT_TESTNET_ID,
        //     process.env.TEST_TOKEN_TESTNET_ID,
        //     1_000_000_000,
        // )
        //
        // await hederaOpeator.transferToken(
        //     process.env.TEST_TOKEN_TESTNET_ID,
        //     process.env.SMARTCONTRACT_TESTNET_ID,
        //     10_000
        // )

        await hederaOpeator.callWithdrawSmartContract(
            process.env.SMARTCONTRACT_TESTNET_ID,
            process.env.TEST_TOKEN_TESTNET_ID,
            process.env.HEDERA_TESTNET_EVM_ADDRESS,
            5_000
        )


        // decodeTransactionLogs("0.0.6976324-1760717226-873639345")


        // await hederaOpeator.getTokenInfo(process.env.TEST_TOKEN_TESTNET_ID)

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

        // const res = await hederaOpeator.createToken(
        //     "Xtreamly Test Token",
        //     "XTT",
        //     1_000_000,
        //     6
        // )

        // const res = await hederaOpeator.mintToken(
        //     process.env.TESTNET_TEST_TOKEN_ID,
        //     2_000_000
        // )

        // const res = await hederaOpeator.associateTokenToContract(
        //     process.env.TEST_SMARTCONTRACT_ID,
        //     // process.env.HEDERA_TEST_ACCOUNT_ID,
        //     process.env.TESTNET_TEST_TOKEN_ID,
        // )

        // const res = await hederaOpeator.getTokenInfo(
        //     process.env.TESTNET_TEST_TOKEN_ID,
        // )

        // const res = await hederaOpeator.sendToken(
        //     process.env.TESTNET_TEST_TOKEN_ID,
        //     process.env.TEST_SMARTCONTRACT_ID,
        //     1_000_000
        // )


        // const res = await hederaOpeator.callAssociateSmartContract(
        //     process.env.TEST_SMARTCONTRACT_ID,
        //     process.env.TESTNET_TEST_TOKEN_ID,
        // )
        // console.log(res)

        // const res = await hederaOpeator.callApproveSmartContract(
        //     process.env.TEST_SMARTCONTRACT_ID,
        //     process.env.SAMPLE_TESTNET_TOKEN_ID,
        //     process.env.SAUCERSWAP_ROUTER_TESTNET_ID,
        //     100_000_000,
        // )
        // console.log(res)


        // const res = await hederaOpeator.callNFTSmartContract(
        //     process.env.TEST_SMARTCONTRACT_EVM_ADDRESS,
        //     process.env.NFT_COLLECTION_EVM_ADDRESS,
        //     parseInt(process.env.NFT_SERIAL_NUMBER)
        // )
        // console.log(res)

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

// test()
