import {
    AccountId,
    PrivateKey,
    Client,
    TokenUpdateNftsTransaction,
    TokenInfoQuery,
    Long,
    TokenMintTransaction

} from "@hashgraph/sdk"; // v2.64.5

export class HederaOperator {

    private account_id: AccountId
    private private_key: PrivateKey
    private client: Client

    constructor(account_id: string, private_key: string) {

        this.account_id = AccountId.fromString(account_id);
        this.private_key = PrivateKey.fromStringECDSA(private_key);
        // Pre-configured client for test network (testnet)
        this.client = Client.forTestnet();

        //Set the operator with the account ID and private key
        this.client.setOperator(this.account_id, this.private_key);

    }

    async getNFTCollection(collectionId: string) {
        const query = new TokenInfoQuery({
            tokenId: collectionId
        })

        const info = await query.execute(this.client)
        console.log(info)
        return info
    }

    async updateNFTMetadata(tokenId: string, serialNumber: number, newMetadata: any) {
        const newMetadataBuffer = Buffer.from(JSON.stringify(newMetadata));
        const txUpdateNfts = new TokenUpdateNftsTransaction()
            .setTokenId(tokenId) //Fill in the token ID
            .setSerialNumbers([Long.fromInt(serialNumber)]) //Fill in the serial numbers
            .setMetadata(newMetadataBuffer) //Fill in the new metadata
            .freezeWith(this.client);

        //Sign the transaction with the metadata key
        const txUpdateNftsSigned = await txUpdateNfts.sign(this.private_key) //Fill in the metadata private key

        //Submit the signed transaction to a Hedera network
        const txUpdateNftsResponse = await txUpdateNftsSigned.execute(this.client);

        //Get receipt for token update nfts metadata transaction and log the status
        const receiptUpdateNftsResponseTx = await txUpdateNftsResponse.getReceipt(this.client);

        //Get the transaction consensus status
        const statusUpdateNftsResponseTx = receiptUpdateNftsResponseTx.status;
        //Get the Transaction ID
        const txUpdateNftsId = txUpdateNftsResponse.transactionId.toString();

        console.log("--------------------------------- Token Update NFT Metadata ---------------------------------");
        console.log("Receipt status           :", statusUpdateNftsResponseTx.toString());
        console.log("Transaction ID           :", txUpdateNftsId);
        console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txUpdateNftsId);
        return receiptUpdateNftsResponseTx
    }

    async createNFT(tokenId: string, newMetadata: any) {
        const newMetadataBuffer = Buffer.from(JSON.stringify(newMetadata));

        const tx = await new TokenMintTransaction()
            .setTokenId(tokenId) // your existing collection
            .setMetadata([
                newMetadataBuffer
            ])
            .freezeWith(this.client)
            .sign(this.private_key);

        const res = await tx.execute(this.client);
        const receipt = await res.getReceipt(this.client);
        console.log(receipt)
        console.log("New NFT serials:", receipt.serials.map(s => s.toInt()));

        return receipt
    }

    close() {
        this.client.close()
    }
}
