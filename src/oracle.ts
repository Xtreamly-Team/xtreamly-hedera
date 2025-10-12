import { HederaOperator } from "./hedera.js"
import { Xtreamly } from "./xtreamly.js"

export async function sendSignalToHedera(token: string) {
    const xtreamly = new Xtreamly()
    const signal = await xtreamly.getIntervalLastSignal(token)
    const actualSignal = signal.long ? 'long' : signal.short ? 'short' : 'none'

    const hederaOpeator = new HederaOperator(
        process.env.HEDERA_TEST_ACCOUNT_ID,
        process.env.HEDERA_TEST_PRIVATE_KEY
    )
    try {

        const tokenId = process.env.NFT_COLLECTION_TOKEN_ID
        const nftSerialNumber = parseInt(process.env.NFT_SERIAL_NUMBER)

        const signalToSend = {
            'symbol': signal.symbol,
            'action': actualSignal,
            'timestamp': signal.prediction_time,
        }

        console.log(`Sending signal to Hedera: ${JSON.stringify(signalToSend)}`)

        const res = await hederaOpeator.updateNFTMetadata(
            tokenId,
            nftSerialNumber,
            signalToSend,
        )
        console.log(res)

    } catch (error) {
        console.error(error);
    } finally {
        hederaOpeator.close()
    }
}
