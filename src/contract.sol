// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

// import "hedera-token-service/HederaTokenService.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/HederaTokenService.sol";

// import "hedera-token-service/ExpiryHelper.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/ExpiryHelper.sol";

// import "hedera-token-service/KeyHelper.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/KeyHelper.sol";

// import "./ISwapRouter.sol";

struct NFTMetadata {
    uint8 symbolCode;   // first uint8
    uint8 actionCode;   // second uint8
    uint64 timestamp;   // epoch ms
}


interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);

    function sweepToken(
        address token,
        uint256 amountMinimum,
        address recipient
    ) external payable;

    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}


contract XtreamlyContract is HederaTokenService, ExpiryHelper, KeyHelper {

    event ResponseCode(int responseCode);
    event NonFungibleTokenInfo(IHederaTokenService.NonFungibleTokenInfo tokenInfo);
    event ActionData(NFTMetadata metadata);

    address public immutable swapRouter; // e.g. 0x00000000000000000000000000000000003c437A (SaucerSwap mainnet router)

    constructor(address _router) {
        swapRouter = _router;
    }

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

    function approveTokenToRouter(address token, uint256 amount) public returns (int responseCode) {

        responseCode = HederaTokenService.approve(token, swapRouter, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function associateTokenPublic(address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(address(this), token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    // Receiver should be given as EVM native (not derived from account id)
    function withdrawToken(address token, address receiver, int64 amount) public returns (int responseCode) {
        responseCode = HederaTokenService.transferToken(token, address(this), receiver, int64(amount));
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    /**
     * Perform token swap via multicall (exactInput + sweepToken)
     * Make sure both tokens are associated with contract and also approve tokenIn to router with amountIn
     */
    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn
    ) external payable {

        // Build the path: tokenIn + fee + tokenOut
        bytes memory path = abi.encodePacked(tokenIn, fee, tokenOut);

        // Build parameters for exactInput
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: swapRouter, // same pattern as your JS version — router holds temporary swap output
            deadline: block.timestamp + 1200, // 20 minutes
            amountIn: amountIn,
            amountOutMinimum: 0
        });

        // Encode the calls
        bytes[] memory multicallData = new bytes[](2);
        multicallData[0] = abi.encodeWithSelector(
            ISwapRouter.exactInput.selector,
            params
        );
        multicallData[1] = abi.encodeWithSelector(
            ISwapRouter.sweepToken.selector,
            tokenOut,
            0,
            msg.sender // final recipient of tokenOut
        );

        // 5️⃣ Call the router multicall
        (bool success, ) = swapRouter.call(
            abi.encodeWithSelector(ISwapRouter.multicall.selector, multicallData)
        );
        require(success, "Router multicall failed");
    }

}
