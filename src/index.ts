
import {
    AccountId,
    PrivateKey,
    Client,
    TokenUpdateNftsTransaction,
    TokenNftInfoQuery,
    NftId,
    TokenId,
    TokenInfoQuery,
    Long,
    TokenMintTransaction

} from "@hashgraph/sdk"; // v2.64.5
import { config } from "dotenv";

config()

async function main() {
    let client;
    try {
        // Your account ID and private key from string value
        const MY_ACCOUNT_ID = AccountId.fromString(process.env.HEDERA_TEST_ACCOUNT_ID);
        const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(process.env.HEDERA_TEST_PRIVATE_KEY);

        // Pre-configured client for test network (testnet)
        client = Client.forTestnet();

        //Set the operator with the account ID and private key
        client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);


        const tokenId = "0.0.7018703"

        const query = new TokenInfoQuery({
            tokenId: tokenId
        })

        const info = await query.execute(client)
        console.log(info)
        process.exit()



        // const tx = await new TokenMintTransaction()
        //     .setTokenId(tokenId) // your existing collection
        //     .setMetadata([Buffer.from(JSON.stringify({
        //         token: "WETH",
        //         direction: "short",
        //         timestamp: new Date().toISOString(),
        //     }))])
        //     .freezeWith(client)
        //     .sign(MY_PRIVATE_KEY);
        //
        // const res = await tx.execute(client);
        // const receipt = await res.getReceipt(client);
        // console.log(receipt)
        // console.log("New NFT serials:", receipt.serials.map(s => s.toInt()));

        // const newMetadata1 = Buffer.from(JSON.stringify({
        //     name: "Updated NFT #1",
        //     description: "Now with new metadata",
        //     image: "ipfs://bafyNEWCID"
        // }));
        //
        // const serialNumber = Long.fromInt(0)
        //
        // //Create the transaction
        // const txUpdateNfts = new TokenUpdateNftsTransaction()
        //     .setTokenId(tokenId) //Fill in the token ID
        //     .setSerialNumbers([serialNumber]) //Fill in the serial numbers
        //     .setMetadata(newMetadata1) //Fill in the new metadata
        //     .freezeWith(client);
        //
        // //Sign the transaction with the metadata key
        // const txUpdateNftsSigned = await txUpdateNfts.sign(MY_PRIVATE_KEY) //Fill in the metadata private key
        //
        // //Submit the signed transaction to a Hedera network
        // const txUpdateNftsResponse = await txUpdateNftsSigned.execute(client);
        //
        // //Get receipt for token update nfts metadata transaction and log the status
        // const receiptUpdateNftsResponseTx = await txUpdateNftsResponse.getReceipt(client);
        //
        // //Get the transaction consensus status
        // const statusUpdateNftsResponseTx = receiptUpdateNftsResponseTx.status;
        //
        // //Get the Transaction ID
        // const txUpdateNftsId = txUpdateNftsResponse.transactionId.toString();
        //
        // console.log("--------------------------------- Token Update NFT Metadata ---------------------------------");
        // console.log("Receipt status           :", statusUpdateNftsResponseTx.toString());
        // console.log("Transaction ID           :", txUpdateNftsId);
        // console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txUpdateNftsId);


    } catch (error) {
        console.error(error);
    } finally {
        if (client) client.close();
    }
}

main();

