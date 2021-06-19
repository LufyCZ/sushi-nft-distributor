import {parseBalanceMap} from './parse-balance-map'

const testjson = {
    "0x7892A3f81368d6e07f22C3675d088698DED30FE4": 1
}

console.log(JSON.stringify(parseBalanceMap(testjson)))