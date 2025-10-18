// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

// import "hedera-token-service/HederaTokenService.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/HederaTokenService.sol";

// import "hedera-token-service/ExpiryHelper.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/ExpiryHelper.sol";

// import "hedera-token-service/KeyHelper.sol";
import "https://raw.githubusercontent.com/hashgraph/hedera-smart-contracts/refs/heads/main/contracts/system-contracts/hedera-token-service/KeyHelper.sol";

struct TradeSignal {
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
    event SignalReceived(TradeSignal metadata);

    address public immutable swapRouter; // e.g. 0x00000000000000000000000000000000003c437A (SaucerSwap mainnet router)
    address public immutable wethAddress;
    address public immutable usdcAddress;
    address public immutable signalNFTAddress;
    int64 public immutable signalNFTSerialNumber;

    constructor(address _router, address _wethAddress, address _usdcAddress, address _signalNFTAddress, int64 _signalNFTSerialNumber) {
        swapRouter = _router;
        wethAddress = _wethAddress;
        usdcAddress = _usdcAddress;
        signalNFTAddress = _signalNFTAddress;
        signalNFTSerialNumber = _signalNFTSerialNumber;
    }

    function readTradeSignal()
        internal
        returns (TradeSignal memory)
    {
        int responseCode;
        IHederaTokenService.NonFungibleTokenInfo memory info;

        emit ResponseCode(responseCode);

        // Call HTS precompile
        (responseCode, info) = HederaTokenService.getNonFungibleTokenInfo(signalNFTAddress, signalNFTSerialNumber);
        require(responseCode == HederaResponseCodes.SUCCESS, "HTS call failed");

        emit NonFungibleTokenInfo(info);

        // Decode the bytes using the same types used during minting
        (uint8 symbolCode, uint8 actionCode, uint64 timestamp) =
            abi.decode(info.metadata, (uint8, uint8, uint64));

        // Populate struct
        TradeSignal memory md = TradeSignal(symbolCode, actionCode, timestamp);

        emit SignalReceived(md);
        
        return md;
    }

    function readTradeSignalPublic()
        public
        returns (TradeSignal memory)
    {
        return readTradeSignal();
    }

    function associateTokenPublic(address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(address(this), token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    // Receiver should be given as EVM native (not derived from account id).
    // This is only be realisticly used if a token was transfered to this contract by mistake
    function withdrawToken(address token, address receiver, int64 amount) public returns (int responseCode) {
        responseCode = HederaTokenService.transferToken(token, address(this), receiver, int64(amount));
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    /**
     * Perform token swap via multicall (exactInput + sweepToken)
     * Make sure both tokens are associated with contract and also approve tokenIn to router with at least amountIn
     * Contract would send the amount from caller to itself and after swapping it with router, it automatically sends the resulting tokens to caller,
     * Meaning no token will remain in the contract itself
     */
    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn
    ) internal {

        // require(amountIn <= uint64(type(int64).max), "Amount exceeds int64 max");
        // int64 amountInt64 = int64(uint64(amountIn));
        // HederaTokenService.transferFrom(tokenIn, msg.sender, address(this), amountInt64);
        int  responseCode = this.transferFrom(tokenIn, msg.sender, address(this), amountIn);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        // Check current allowance for the router
        (int256 approvalresponseCode, uint256 currentAllowance) = HederaTokenService.allowance(
            tokenIn,
            address(this),  // this contract
            swapRouter      // spender
        );
        require(approvalresponseCode == HederaResponseCodes.SUCCESS, "Allowance check failed");
        
        // Approve router if needed
        if (currentAllowance < amountIn) {
            int256 approveResponse = HederaTokenService.approve(
                tokenIn,
                swapRouter,
                amountIn
            );
            require(approveResponse == HederaResponseCodes.SUCCESS, "Approval failed");
        }

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

    function swapTokensPublic (
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn
    ) public {
        swapTokens(tokenIn, tokenOut, fee, amountIn);
    }

    function autoTrade(
        uint256 usdcAmount, 
        uint256 wethAmount
    ) external {
        TradeSignal memory tradeSignal = readTradeSignal();
        if (tradeSignal.actionCode == 1) {
            swapTokens(usdcAddress, wethAddress, 1500, usdcAmount);
        } else if (tradeSignal.actionCode == 2) {
            swapTokens(wethAddress, usdcAddress, 1500, wethAmount);
        }
    }

}
