import { config } from "dotenv";
import { HederaOperator } from "./hedera.js";
import { Xtreamly } from "./xtreamly.js";

config()

export type SUPPORTED_TOKEN = 'ETH'
export type SUPPORTED_ACTION = 'NONE' | 'LONG' | 'SHORT'

export const TOKENS_MAP = {
    'ETH': 1,
}

export const ACTIONS_MAP = {
    'NONE': 0,
    'LONG': 1,
    'SHORT': 2,
}

interface SerializableSignal {
    token: SUPPORTED_TOKEN;
    action: SUPPORTED_ACTION;
    timestamp: number;
}

export class SignalNFTApp {
    hederaOpeator: HederaOperator;
    constructor() {
        this.hederaOpeator = new HederaOperator(
            process.env.HEDERA_ACCOUNT_ID,
            process.env.HEDERA_PRIVATE_KEY,
            // process.env.HEDERA_TEST_ACCOUNT_ID,
            // process.env.HEDERA_TEST_PRIVATE_KEY,
            false,
        )
    }

    async fetchSignal(token: SUPPORTED_TOKEN) {
        const xtreamly = new Xtreamly()
        const signal = await xtreamly.getIntervalLastSignal(token)
        const actualSignal: SUPPORTED_ACTION = signal.long ? 'LONG' : signal.short ? 'SHORT' : 'NONE'

        console.log(
            `Fetched trading signal: ${JSON.stringify(signal)
            }`
        )

        return {
            token,
            action: actualSignal,
            timestamp: (new Date(signal.prediction_time)).getTime(),
        } as SerializableSignal

    }

    // Update the signal NFT with new signal data
    async updateSignalNFT(
        token: SUPPORTED_TOKEN,
        action: SUPPORTED_ACTION,
        timestamp: number,

    ) {
        console.log(`Updating Signal NFT with token: ${token}, action: ${action}, timestamp: ${timestamp}`)
        return await this.hederaOpeator.updateNFTMetadata(
            process.env.SIGNAL_NFT_COLLECTION_TOKEN_ID,
            parseInt(process.env.SIGNAL_NFT_SERIAL_NUMBER),
            ['uint8', 'uint8', 'uint64'],
            [TOKENS_MAP[token], ACTIONS_MAP[action], timestamp]
        )
    }

    async fetchAndUpdateSignalNFT(token: SUPPORTED_TOKEN) {
        const signal = await this.fetchSignal(token)
        return await this.updateSignalNFT(
            signal.token,
            signal.action,
            signal.timestamp,
        )
    }

    close() {
        this.hederaOpeator.close()
    }
}
