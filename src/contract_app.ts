import { config } from "dotenv";
import { HederaOperator } from "./hedera.js";

config()

export class ContractApp {
    hederaOpeator: HederaOperator;

    // You can use the app to either setup the contract or just interact with it. If the contract is already deployed, you don't need to deploy or initialize it, just use the firstTimeSetup and other functions
    constructor() {
        this.hederaOpeator = new HederaOperator(
            process.env.HEDERA_ACCOUNT_ID,
            process.env.HEDERA_PRIVATE_KEY,
            // process.env.HEDERA_TEST_ACCOUNT_ID,
            // process.env.HEDERA_TEST_PRIVATE_KEY,
            false,
        )
    }

    // This should only be deployed once and only after NFT is created
    async deployContract() {
        const contractId = await this.hederaOpeator.createSmartContract(
            process.env.SMARTCONTRACT_BYTECODE,
            process.env.ROUTER_ID,
            process.env.WETH_TOKEN_ID,
            process.env.USDC_TOKEN_ID,
            process.env.SIGNAL_NFT_COLLECTION_TOKEN_ID,
            parseInt(process.env.SIGNAL_NFT_SERIAL_NUMBER),
        )
        console.log(contractId)
    }


    // This should only be called after the contract is deployed and its id is saved as environ
    async initializeContract() {
        await this.hederaOpeator.callAssociateSmartContract(
            process.env.SMARTCONTRACT_ID,
            process.env.USDC_TOKEN_ID,
        )

        await this.hederaOpeator.callAssociateSmartContract(
            process.env.SMARTCONTRACT_ID,
            process.env.WETH_TOKEN_ID,
        )
    }

    // This should be called by any user that wants to use the contract for the first time. The numbers to approve is not important and can be changed by any web3 app that is using the contract
    async userFirstTimeSetup() {
        await this.hederaOpeator.approve(
            process.env.USDC_TOKEN_ID,
            process.env.SMARTCONTRACT_ID,
            1_000_000_000,
        )
        await this.hederaOpeator.approve(
            process.env.WETH_TOKEN_ID,
            process.env.SMARTCONTRACT_ID,
            1_000_000_000,
        )
    }


    // This can be called by any user that wants to manually swap tokens on Saucerswap using this contract. Note that its only for testing since this contract is not mean as interface to saucerswap but an automated trader
    // The amount to be supplied is web3 version (e.g. 1_000_000 for 1USDC)
    async testSwap(
        tokenIn: string,
        tokenOut: string,
        amount: number,
        fee: number = 1500,
    ) {
        await this.hederaOpeator.callSwapInSmartContract(
            process.env.SMARTCONTRACT_ID,
            tokenIn,
            tokenOut,
            fee,
            amount,
        )
    }

    // This is only for testing to withdraw any leftover tokens in the contract back to the operator account. Technically it shouldn't be possible for a token to remain in the contract while swapping but this is here for any edge cases where we need a escape hatch for any token that is transferred incorrectly or for any reason is stuck in the contract.
    async withdrawAll() {
        await this.hederaOpeator.callWithdrawSmartContract(
            process.env.SMARTCONTRACT_TESTNET_ID,
            process.env.TEST_TOKEN_TESTNET_ID,
            process.env.HEDERA_TESTNET_EVM_ADDRESS,
            5_000
        )
    }

    // This can be called by anyone to read the current signal stored in the NFT by the contract. Used mainly for testing since the contract itself reads the signal in autoTrade function. This calls the contract itself which reads the NFT not just reading NFT directly
    async readSignal() {
        await this.hederaOpeator.callReadNFTSignal(
            process.env.SMARTCONTRACT_ID,
        )
    }

    // NOTE: Main function of the contract that should be called periodically to perform trades based on the signal stored in the NFT. 
    // The usdcAmount and wethAmount are the amounts are to be supplied as nominal not web3 version (e.g. 5 USDC or 0.051 WETH)
    async autoTrade(
        usdcAmount: number,
        wethAmount: number
    ) {
        return await this.hederaOpeator.callAutoTradeInSmartContract(
            process.env.SMARTCONTRACT_ID,
            Math.floor(usdcAmount * 1_000_000),
            Math.floor(wethAmount * 100_000_000)
        )
    }

    close() {
        this.hederaOpeator.close()
    }
}
