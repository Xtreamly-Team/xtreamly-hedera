import {
    AccountId,
    PrivateKey,
    Client,
    TokenUpdateNftsTransaction,
    TokenInfoQuery,
    Long,
    TokenMintTransaction,
    ContractCreateFlow,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractId,
    EvmAddress,
    ContractLogInfo

} from "@hashgraph/sdk"; // v2.64.5

import { ethers } from "ethers";

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

    async updateNFTMetadata(tokenId: string, serialNumber: number, types: string[], data: any[]) {
        // const newMetadataBuffer = Buffer.from(JSON.stringify(newMetadata));
        // const coder = new AbiCoder()
        const encodedString = ethers.utils.defaultAbiCoder.encode(
            [...types],
            [...data]
        );
        const encodedBytes = ethers.utils.arrayify(encodedString)

        const txUpdateNfts = new TokenUpdateNftsTransaction()
            .setTokenId(tokenId) //Fill in the token ID
            .setSerialNumbers([Long.fromInt(serialNumber)]) //Fill in the serial numbers
            .setMetadata(encodedBytes) //Fill in the new metadata
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

    async createSmartContract(bytecode: string) {
        //Create the transaction
        const contractCreateFlow = new ContractCreateFlow()
            .setGas(10_000_000)
            .setBytecode(bytecode); //Fill in the bytecode

        //Sign the transaction with the client operator key and submit to a Hedera network
        const txContractCreateFlowResponse = await contractCreateFlow.execute(this.client);

        //Get the receipt of the transaction
        const receiptContractCreateFlow = await txContractCreateFlowResponse.getReceipt(this.client);

        //Get the status of the transaction
        const statusContractCreateFlow = receiptContractCreateFlow.status;

        //Get the Transaction ID
        const txContractCreateId = txContractCreateFlowResponse.transactionId.toString();

        //Get the new contract ID
        const contractId = receiptContractCreateFlow.contractId;

        console.log("--------------------------------- Create Contract Flow ---------------------------------");
        console.log("Consensus status           :", statusContractCreateFlow.toString());
        console.log("Transaction ID             :", txContractCreateId);
        console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractCreateId);
        console.log("Contract ID                :", contractId);

        return contractId
    }

    async callNFTSmartContract(contractId: string, nftAddress: string, serialNumber: number) {
        console.log("Calling smart contract:", contractId, "with nftAddress:", nftAddress, "and serialNumber:", serialNumber)
        //Create the transaction
        const txContractExecute = new ContractExecuteTransaction()
            .setContractId(ContractId.fromEvmAddress(0, 0, contractId)) //Fill in the contract ID
            .setGas(1_000_000)
            .setFunction("readNFTMetadata", new ContractFunctionParameters().addAddress(EvmAddress.fromString(nftAddress)).addInt64(serialNumber));

        //Sign with the client operator private key to pay for the transaction and submit the query to a Hedera network
        const txContractExecuteResponse = await txContractExecute.execute(this.client);

        //Request the receipt of the transaction
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(this.client);

        //Get the transaction consensus status
        const statusContractExecuteTx = receiptContractExecuteTx.status;

        //Get the Transaction ID
        const txContractExecuteId = txContractExecuteResponse.transactionId.toString();

        // const txRecord = await txContractExecuteResponse.getRecord(this.client)
        // console.log("LOGS")
        // console.log(txRecord.contractFunctionResult.logs)


        console.log("--------------------------------- Execute Contract Flow ---------------------------------");
        console.log("Consensus status           :", statusContractExecuteTx.toString());
        console.log("Transaction ID             :", txContractExecuteId);
        console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractExecuteId);

        return txContractExecuteResponse
    }

    async getContractLogs(transactionId: string, abi: any) {
        const contractInterface = new ethers.utils.Interface(abi);

        const baseUrl = 'https://testnet.mirrornode.hedera.com/api/v1/contracts/results'
        let standardTransactionId = transactionId.replace('@', '-')
        // Replace the last '.' with '-'
        standardTransactionId = standardTransactionId.replace(/\.(?=[^.]*$)/, '-');

        console.log(standardTransactionId)
        const url = `${baseUrl}/${standardTransactionId}`
        console.log(url)

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const logs = data['logs'];
            // console.log(logs); // contains the contract result including logs
            logs.forEach(log => {
                try {
                    const decoded = contractInterface.parseLog(log);
                    console.log("Event name:", decoded.name);
                    console.log("Event args:", decoded.args);
                } catch (err) {
                    console.warn("Could not decode log:", log);
                }
            });
            return logs
        } catch (error) {
            console.error("Error fetching contract logs:", error);
        }
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
