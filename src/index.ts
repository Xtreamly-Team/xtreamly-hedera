import { config } from "dotenv";
import { HederaOperator } from "./hedera";
config()

async function test() {
    const hederaOpeator = new HederaOperator(
        process.env.HEDERA_TEST_ACCOUNT_ID,
        process.env.HEDERA_TEST_PRIVATE_KEY
    )

    try {

        const tokenId = process.env.NFT_COLLECTION_TOKEN_ID
        const nftSerialNumber = parseInt(process.env.NFT_SERIAL_NUMBER)

        const res = await hederaOpeator.updateNFTMetadata(
            tokenId,
            nftSerialNumber,
            {
                'timestamp': new Date().toISOString(),
                'signal': 'short',
            }
        )
        console.log(res)

    } catch (error) {
        console.error(error);
    } finally {
        hederaOpeator.close()
    }
}

test()
