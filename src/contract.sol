// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

// import "hedera-token-service/HederaTokenService.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/HederaTokenService.sol";

// import "hedera-token-service/ExpiryHelper.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/ExpiryHelper.sol";

// import "hedera-token-service/KeyHelper.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/KeyHelper.sol";

import "./ISwapRouter.sol";

struct NFTMetadata {
    uint8 symbolCode;   // first uint8
    uint8 actionCode;   // second uint8
    uint64 timestamp;   // epoch ms
}


contract HTSContract is HederaTokenService, ExpiryHelper, KeyHelper {

    event ResponseCode(int responseCode);
    event NonFungibleTokenInfo(IHederaTokenService.NonFungibleTokenInfo tokenInfo);
    event ActionData(NFTMetadata metadata);



    function readNFTMetadata(address token, int64 serialNumber)
        public
        returns (NFTMetadata memory)
    {
        int responseCode;
        IHederaTokenService.NonFungibleTokenInfo memory info;

        emit ResponseCode(responseCode);

        // Call HTS precompile
        (responseCode, info) = HederaTokenService.getNonFungibleTokenInfo(token, serialNumber);
        require(responseCode == HederaResponseCodes.SUCCESS, "HTS call failed");

        emit NonFungibleTokenInfo(info);

        // Decode the bytes using the same types used during minting
        (uint8 symbolCode, uint8 actionCode, uint64 timestamp) =
            abi.decode(info.metadata, (uint8, uint8, uint64));

        // Populate struct
        NFTMetadata memory md = NFTMetadata(symbolCode, actionCode, timestamp);

        emit ActionData(md);
        
        return md;
    }

    event ApprovalResponse(int64 responseCode);

    function approveToken(address token, address spender, uint256 amount) public returns (int responseCode) {

        responseCode = HederaTokenService.approve(token, spender, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function associateTokenPublic(address account, address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(account, token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function buyWETH(uint256 amount) public {

    }

}

