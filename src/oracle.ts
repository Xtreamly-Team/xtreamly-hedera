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
            'timestamp': (new Date(signal.prediction_time)).getTime(),
        }

        console.log(`Sending signal to Hedera: ${JSON.stringify(signalToSend)}`)

        const tokensMap = {
            'BTC': 0,
            'ETH': 1,
            'SOL': 2
        }

        const actionsMap = {
            'none': 0,
            'long': 1,
            'short': 2,
        }

        const res = await hederaOpeator.updateNFTMetadata(
            tokenId,
            nftSerialNumber,
            ['uint8', 'uint8', 'uint64'],
            [tokensMap[signalToSend.symbol], actionsMap[signalToSend.action], signalToSend.timestamp]
        )
        console.log(res)

    } catch (error) {
        console.error(error);
    } finally {
        hederaOpeator.close()
    }
}
