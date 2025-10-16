import { HederaOperator } from "./hedera.js"

export async function swap(
    tokenA: string,
    tokenB: string,
    amountA: number,
    fee: number
) {
    const hederaOpeator = new HederaOperator(
        process.env.HEDERA_ACCOUNT_ID,
        process.env.HEDERA_PRIVATE_KEY
    )
}

