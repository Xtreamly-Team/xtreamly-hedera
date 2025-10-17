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
    TokenCreateTransaction,
    TokenType,
    AccountAllowanceApproveTransaction,
    TransferTransaction,
    Hbar,
    AccountInfoQuery,
    AccountCreateTransaction,
    AccountUpdateTransaction,
    TokenAssociateTransaction

} from "@hashgraph/sdk"; // v2.64.5

import { ethers } from "ethers";

import erc20Abi from "./abi/erc20.json" assert { type: "json" };;
import saucerRouterAbi from "./abi/saucer_router_abi.json" assert { type: "json" };;

// WARN: account_id.toEvmAddress just returns the account number in evm format (aka returns Hex of the account id decimal number). The associated EVM address is different. It is the equivalent evm public address derived from the private key
export class HederaOperator {

    private account_id: AccountId
    private private_key: PrivateKey
    private evm_address: string
    private client: Client

    constructor(account_id: string, private_key: string, testnet: boolean = false) {

        this.account_id = AccountId.fromString(account_id);
        this.private_key = PrivateKey.fromStringECDSA(private_key);
        const wallet = new ethers.Wallet(this.private_key.toStringRaw());
        this.evm_address = wallet.address

        // Pre-configured client for test network (testnet)
        if (testnet)
            this.client = Client.forTestnet();
        else
            this.client = Client.forMainnet();


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

    async createToken(tokenName: string, tokenSymbol: string, initialSupply: number = 1_000, decimals: number = 6) {
        const txTokenCreate = await new TokenCreateTransaction()
            .setTokenName(tokenName)
            .setTokenSymbol(tokenSymbol)
            .setTokenType(TokenType.FungibleCommon)
            .setTreasuryAccountId(this.account_id)
            .setInitialSupply(initialSupply)
            .setSupplyKey(this.private_key)
            .setDecimals(decimals)
            .freezeWith(this.client);

        //Sign the transaction with the token treasury account private key
        const signTxTokenCreate = await txTokenCreate.sign(this.private_key);

        //Sign the transaction with the client operator private key and submit to a Hedera network
        const txTokenCreateResponse = await signTxTokenCreate.execute(this.client);

        //Get the receipt of the transaction
        const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(this.client);

        //Get the token ID from the receipt
        const tokenId = receiptTokenCreateTx.tokenId;

        //Get the transaction consensus status
        const statusTokenCreateTx = receiptTokenCreateTx.status;

        //Get the Transaction ID
        const txTokenCreateId = txTokenCreateResponse.transactionId.toString();

        console.log("--------------------------------- Token Creation ---------------------------------");
        console.log("Receipt status           :", statusTokenCreateTx.toString());
        console.log("Transaction ID           :", txTokenCreateId);
        console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txTokenCreateId);
        console.log("Token ID                 :", tokenId.toString());
    }

    async mintToken(tokenId: string, amount: number) {
        const txTokenMint = await new TokenMintTransaction()
            .setTokenId(tokenId) //Fill in the token ID
            .setAmount(amount)
            .freezeWith(this.client);

        //Sign with the supply private key of the token 
        const signTxTokenMint = await txTokenMint.sign(this.private_key); //Fill in the supply private key

        //Submit the transaction to a Hedera network    
        const txTokenMintResponse = await signTxTokenMint.execute(this.client);

        //Request the receipt of the transaction
        const receiptTokenMintTx = await txTokenMintResponse.getReceipt(this.client);

        //Get the transaction consensus status
        const statusTokenMintTx = receiptTokenMintTx.status;

        //Get the Transaction ID
        const txTokenMintId = txTokenMintResponse.transactionId.toString();

        console.log("--------------------------------- Mint Token ---------------------------------");
        console.log("Receipt status           :", statusTokenMintTx.toString());
        console.log("Transaction ID           :", txTokenMintId);
        console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txTokenMintId);
    }

    async transferToken(tokenId: string, receiver: string, amount: number) {
        const transferTx = new TransferTransaction()
            .addTokenTransfer(tokenId, this.account_id, -amount)   // deduct from sender
            .addTokenTransfer(tokenId, AccountId.fromString(receiver), amount)  // add to receiver
            .freezeWith(this.client);

        //Sign and execute
        const signedTx = await transferTx.signWithOperator(this.client);
        const submitTx = await signedTx.execute(this.client);

        //Get receipt
        const receipt = await submitTx.getReceipt(this.client);

        console.log(`✅ Token transfer status: ${receipt.status.toString()}`);
        console.log(`🔹 Tx ID: ${submitTx.transactionId.toString()}`);
    }

    // NOTE: You need to send the evm address (not derived from id) as receiver
    async callWithdrawSmartContract(
        contractId: string,
        tokenId: string,
        receiverEvm: string,
        amount: number,
    ) {
        console.log("Calling smart contract:", contractId)

        const txContractExecute = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(contractId))
            .setGas(1_000_000)
            .setFunction("withdrawToken",
                new ContractFunctionParameters()
                    .addAddress(AccountId.fromString(tokenId).toEvmAddress())
                    .addAddress(receiverEvm)
                    .addInt64(amount));

        const txContractExecuteResponse = await txContractExecute.execute(this.client);
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(this.client);
        const statusContractExecuteTx = receiptContractExecuteTx.status;
        const txContractExecuteId = txContractExecuteResponse.transactionId.toString();


        console.log("--------------------------------- Execute Contract Flow ---------------------------------");
        console.log("Consensus status           :", statusContractExecuteTx.toString());
        console.log("Transaction ID             :", txContractExecuteId);
        console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractExecuteId);

        return txContractExecuteResponse
    }

    async callSwapInSmartContract(
        contractId: string,
        tokenIn: string,
        tokenOut: string,
        fee: number,
        amountIn: number
    ) {
        console.log("Calling smart contract:", contractId)

        const txContractExecute = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(contractId))
            .setGas(1_000_000)
            .setFunction("swapTokens",
                new ContractFunctionParameters()
                    .addAddress(AccountId.fromString(tokenIn).toEvmAddress())
                    .addAddress(AccountId.fromString(tokenOut).toEvmAddress())
                    .addUint24(fee)
                    .addUint256(amountIn))

        const txContractExecuteResponse = await txContractExecute.execute(this.client);
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(this.client);
        const statusContractExecuteTx = receiptContractExecuteTx.status;
        const txContractExecuteId = txContractExecuteResponse.transactionId.toString();


        console.log("--------------------------------- Execute Contract Flow ---------------------------------");
        console.log("Consensus status           :", statusContractExecuteTx.toString());
        console.log("Transaction ID             :", txContractExecuteId);
        console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractExecuteId);

        return txContractExecuteResponse
    }

    async getTokenInfo(tokenId: string) {
        const query = new TokenInfoQuery({
            tokenId: tokenId
        })

        const info = await query.execute(this.client)
        console.log(info)
        return info
    }

    async associateToken(tokenId: string) {
        const txTokenAssociate = await new TokenAssociateTransaction()
            .setAccountId(this.account_id)
            .setTokenIds([tokenId]) //Fill in the token ID
            .freezeWith(this.client);

        //Sign with the private key of the account that is being associated to a token 
        //Submit the transaction to a Hedera network    
        const signTxTokenAssociate = await txTokenAssociate.sign(this.private_key);

        const txTokenAssociateResponse = await signTxTokenAssociate.execute(this.client);

        //Request the receipt of the transaction
        const receiptTokenAssociateTx = await txTokenAssociateResponse.getReceipt(this.client);

        //Get the transaction consensus status
        const statusTokenAssociateTx = receiptTokenAssociateTx.status;

        //Get the Transaction ID
        const txTokenAssociateId = txTokenAssociateResponse.transactionId.toString();

        console.log("--------------------------------- Token Associate ---------------------------------");
        console.log("Receipt status           :", statusTokenAssociateTx.toString());
        console.log("Transaction ID           :", txTokenAssociateId);
        console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txTokenAssociateId);
    }

    async createSmartContract(bytecode: string, router_id: string) {
        //Create the transaction
        const contractCreateFlow = new ContractCreateFlow()
            .setGas(10_000_000)
            .setBytecode(bytecode)
            .setConstructorParameters(
                new ContractFunctionParameters().addAddress(AccountId.fromString(router_id).toEvmAddress())
            )

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

    async callReadNFTSmartContract(contractId: string, nftAddress: string, serialNumber: number) {
        console.log("Calling smart contract:", contractId, "with nftAddress:", nftAddress, "and serialNumber:", serialNumber)

        const txContractExecute = new ContractExecuteTransaction()
            .setContractId(ContractId.fromEvmAddress(0, 0, contractId)) //Fill in the contract ID
            .setGas(1_000_000)
            .setFunction("readNFTMetadata", new ContractFunctionParameters().addAddress(EvmAddress.fromString(nftAddress)).addInt64(serialNumber));

        const txContractExecuteResponse = await txContractExecute.execute(this.client);
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(this.client);
        const statusContractExecuteTx = receiptContractExecuteTx.status;
        const txContractExecuteId = txContractExecuteResponse.transactionId.toString();


        console.log("--------------------------------- Execute Contract Flow ---------------------------------");
        console.log("Consensus status           :", statusContractExecuteTx.toString());
        console.log("Transaction ID             :", txContractExecuteId);
        console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractExecuteId);

        return txContractExecuteResponse
    }

    async callAssociateSmartContract(
        contractId: string,
        tokenId: string,
    ) {
        console.log("Calling smart contract:", contractId)

        const txContractExecute = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(contractId))
            .setGas(1_000_000)
            .setFunction("associateTokenPublic",
                new ContractFunctionParameters()
                    .addAddress(AccountId.fromString(tokenId).toEvmAddress()));

        const txContractExecuteResponse = await txContractExecute.execute(this.client);
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(this.client);
        const statusContractExecuteTx = receiptContractExecuteTx.status;
        const txContractExecuteId = txContractExecuteResponse.transactionId.toString();


        console.log("--------------------------------- Execute Contract Flow ---------------------------------");
        console.log("Consensus status           :", statusContractExecuteTx.toString());
        console.log("Transaction ID             :", txContractExecuteId);
        console.log("Hashscan URL               :", "https://hashscan.io/testnet/tx/" + txContractExecuteId);

        return txContractExecuteResponse
    }

    async callApproveToRouterSmartContract(
        contractId: string,
        tokenId: string,
        amount: number,
    ) {
        console.log("Calling smart contract:", contractId)

        const txContractExecute = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(contractId))
            .setGas(1_000_000)
            .setFunction("approveTokenToRouter",
                new ContractFunctionParameters()
                    .addAddress(AccountId.fromString(tokenId).toEvmAddress())
                    .addUint256(amount));

        const txContractExecuteResponse = await txContractExecute.execute(this.client);
        const receiptContractExecuteTx = await txContractExecuteResponse.getReceipt(this.client);
        const statusContractExecuteTx = receiptContractExecuteTx.status;
        const txContractExecuteId = txContractExecuteResponse.transactionId.toString();


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

    async createNFTCollection(name: string, symbol: string) {
        //Create the transaction and freeze for manual signing
        const txTokenCreate = new TokenCreateTransaction()
            .setTokenName(name)
            .setTokenSymbol(symbol)
            .setTokenType(TokenType.NonFungibleUnique)
            .setTreasuryAccountId(this.account_id)
            .setSupplyKey(this.private_key)
            .freezeWith(this.client);

        //Sign the transaction with the token treasury account private key
        const signTxTokenCreate = await txTokenCreate.sign(this.private_key);

        //Sign the transaction with the client operator private key and submit to a Hedera network
        const txTokenCreateResponse = await signTxTokenCreate.execute(this.client);

        //Get the receipt of the transaction
        const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(this.client);

        //Get the token ID from the receipt
        const tokenId = receiptTokenCreateTx.tokenId;

        //Get the transaction consensus status
        const statusTokenCreateTx = receiptTokenCreateTx.status;

        //Get the Transaction ID
        const txTokenCreateId = txTokenCreateResponse.transactionId.toString();

        console.log("--------------------------------- Token Creation ---------------------------------");
        console.log("Receipt status           :", statusTokenCreateTx.toString());
        console.log("Transaction ID           :", txTokenCreateId);
        console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txTokenCreateId);
        console.log("Token ID                 :", tokenId.toString());
    }

    async createNFT(tokenId: string, types: string[], data: any[]) {
        const encodedString = ethers.utils.defaultAbiCoder.encode(
            [...types],
            [...data]
        );
        const encodedBytes = ethers.utils.arrayify(encodedString)

        const tx = await new TokenMintTransaction()
            .setTokenId(tokenId) // your existing collection
            .setMetadata([
                encodedBytes
            ])
            .freezeWith(this.client)
            .sign(this.private_key);

        const res = await tx.execute(this.client);
        const receipt = await res.getReceipt(this.client);
        console.log(receipt)
        console.log("New NFT serials:", receipt.serials.map(s => s.toInt()));

        return receipt
    }

    async updateNFTMetadata(tokenId: string, serialNumber: number, types: string[], data: any[]) {
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


    async checkForApproval(
        tokenId: string, ownerId: string, spenderId: string, amount: number,
    ) {
        const res = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${ownerId}/allowances/tokens`);
        const data = await res.json();

        const allowance = data.allowances.find(
            a => a.token_id === tokenId && a.spender === spenderId
        );

        if (allowance && Number(allowance.amount_granted) > amount) {
            console.log(allowance)
            console.log(`✅ Already approved ${allowance.amount_granted} for spender ${spenderId}`);
            return true
        } else {
            console.log(`❌ Not enought allowance found (${allowance ? allowance.amount_granted : 0}), need to approve first`);
        }
        return false
    }

    async approve(
        tokenId: string, ownerId: string, spenderId: string, amount: number
    ) {
        const tx = new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(tokenId, ownerId, spenderId, amount)
            .freezeWith(this.client);

        const submitTx = await tx.execute(this.client);
        console.log("Approve transaction submitted, waiting for receipt...", submitTx.transactionId.toString())

        const receipt = await submitTx.getReceipt(this.client);
        console.log("Approve transaction status:", receipt.status.toString());
    }

    async swap(
        tokenIn: string,
        tokenOut: string,
        amountIn: number,
        fee: number
    ) {

        const tokenInEVM = `0x${AccountId.fromString(tokenIn).toEvmAddress()}`
        const tokenOutEVM = `0x${AccountId.fromString(tokenOut).toEvmAddress()}`

        console.log(`Swapping ${amountIn} of ${tokenIn}  to ${tokenOut}  with fee ${fee}`)

        const ROUTER_ID = ContractId.fromString(process.env.SAUCER_ROUTER_ID);
        const ROUTER_EVM = process.env.SAUCER_ROUTER_EVM_ADDRESS


        const is_approved = await this.checkForApproval(
            tokenIn,
            this.account_id.toString(),
            ROUTER_ID.toString(),
            amountIn,
        )

        if (!is_approved) {
            await this.approve(
                tokenIn,
                this.account_id.toString(),
                ROUTER_ID.toString(),
                amountIn
            )
        }

        const routerInterface = new ethers.utils.Interface(saucerRouterAbi);

        const path =
            ethers.utils.solidityPack(["address", "uint24", "address"], [tokenInEVM, fee, tokenOutEVM]);

        // Parameters for exactInput
        const swapParams = {
            path: path,
            recipient: ROUTER_EVM,
            deadline: Math.floor(Date.now() / 1000) + 1200,
            amountIn: amountIn,
            amountOutMinimum: 0
        };

        console.log(swapParams)

        const encodedSwapData = routerInterface.encodeFunctionData("exactInput", [swapParams]);

        // Parameters for sweepToken
        const sweepParams = {
            token: tokenOutEVM,
            amountMinimum: 0,
            recipient: this.evm_address,
        }

        const encodedSweepData = routerInterface.encodeFunctionData("sweepToken", [
            sweepParams.token,
            sweepParams.amountMinimum,
            sweepParams.recipient
        ])

        const encodedMulticall = routerInterface.encodeFunctionData("multicall",
            [[encodedSwapData, encodedSweepData]],
        )

        const encdodedMulticallBytes = ethers.utils.arrayify(encodedMulticall)

        let swapTx = await new ContractExecuteTransaction()
            .setContractId(ROUTER_ID)
            .setGas(500_000)
            .setFunctionParameters(encdodedMulticallBytes)
            .freezeWith(this.client)
            .sign(this.private_key);

        let swapSubmit = await swapTx.execute(this.client);
        let swapReceipt = await swapSubmit.getReceipt(this.client);
        console.log("Transaction id: ", swapTx.transactionId.toString())
        console.log("✅ Swap status:", swapReceipt.status.toString());
    }

    close() {
        this.client.close()
    }
}
