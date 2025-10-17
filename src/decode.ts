import { ethers } from "ethers";
import routerAbi from "./abi/saucer_router_abi.json" assert { type: "json" };;
import smartContractAbi from "./abi/xtreamly_testnet_abi.json" assert { type: "json" };;

const iface = new ethers.utils.Interface(routerAbi);

const data = "0xac9650d800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000124c04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000003c437a0000000000000000000000000000000000000000000000000000000068f17cc300000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b000000000000000000000000000000000006f89a0005dc0000000000000000000000000000000000951679000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064df2ab5bb0000000000000000000000000000000000000000000000000000000000951679000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002eb81a30fc23acb5531aad87b4b76c5a6f9559d00000000000000000000000000000000000000000000000000000000"



try {
    const decoded = iface.parseTransaction({ data });

    console.log("Main function:", decoded.name);
    // console.log(decoded)
    // console.log(decoded.args)
    console.info(decoded.name)
    // console.info(decoded.value.toNumber())
    console.info(decoded.signature)
    // console.info(decoded.args[0]['recipient'])
    // console.info(decoded.functionFragment.inputs[0].components)

    // Check if this is a multicall
    if (decoded.name === "multicall") {
        const innerCalls = decoded.args[0];
        console.dir(`\nInner calls found: ${innerCalls.length}`);
        // console.dir(decoded.args, { depth: null });

        innerCalls.forEach((callData, i) => {
            try {
                const sub = iface.parseTransaction({ data: callData });
                console.log(`\n--- Inner Call #${i + 1}: ${sub.name} ---`);
                console.dir(sub.args, { depth: null });
            } catch (err) {
                console.log(`\n--- Inner Call #${i + 1}: Unknown / Not matched ABI ---`);
            }
        });
    } else {
        // console.dir(decoded.args, { depth: null });
    }
} catch (err) {
    console.error("Failed to decode:", err.message);
}

async function decodeTransactionLogs(transactionId: string) {
    const contractInterface = new ethers.utils.Interface(smartContractAbi)

    const mirrorNode = "https://testnet.mirrornode.hedera.com/api/v1";

    let url = `${mirrorNode}/contracts/results/${transactionId}`;
    const res = await (await fetch(url)).json()
    const logs = res.logs
    for (const log of logs) {
        const parsed = contractInterface.parseLog(log)
        console.log(parsed)
    }
}
