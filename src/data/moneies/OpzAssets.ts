import { useQuery } from "react-query"
import axios, { AxiosError } from "axios"
import { fromPairs, toPairs } from "ramda"
import { flatten, groupBy, map, mergeAll, values } from "ramda"
//import { AccAddress } from "@terra-money/terra.js"
import { ASSETS } from "config/constants"
import shuffle from "utils/shuffle"
import { queryKey, RefetchOptions } from "../query"
import { useNetworkName } from "../wallet"

const config = { baseURL: ASSETS }

export const useOpzAssets = <T>(path: string, callback?: (data: T) => T) => {
  return useQuery<T, AxiosError>(
    [queryKey.TerraAssets, path],
    async () => {
      const { data } = await axios.get<T>(path, config)
      return callback?.(data) ?? data
    },
    { ...RefetchOptions.INFINITY }
  )
}

export const useOpzAssetsByNetwork = <T>(
  path: string,
  disabled = false,
  callback?: (data: T) => T
) => {
  const networkName = useNetworkName()

  return useQuery<T | undefined, AxiosError>(
    [queryKey.TerraAssets, path, networkName],
    async () => {
      const { data } = await axios.get<Record<NetworkName, T>>(path, config)
      if (!data[networkName]) return {} as T
      return callback?.(data[networkName]) ?? data[networkName]
    },
    { ...RefetchOptions.INFINITY, enabled: !disabled }
  )
}

export const useIBCWhitelist = () => {
  return useOpzAssetsByNetwork<IBCWhitelist>("ibc/moneies.json")
}

export const useCW20Whitelist = (disabled = false) => {
  return useOpzAssetsByNetwork<CW20Whitelist>(
    "cw20/moneies.json",
    disabled,
    (data) => sortWhitelistCW20(shuffleByProtocol(data))
  )
}

/*
export const useCW20Contracts = () => {
  return useOpzAssetsByNetwork<CW20Contracts>("cw20/moneies.json")
}

export const useCW20Pairs = () => {
  return useOpzAssetsByNetwork<CW20Pairs>("cw20/pairs.dex.json")
}
*/

/*

export type ContractNames =
  | "assertLimitOrder"
  | "routeswap"
  | "tnsRegistry"
  | "tnsReverseRecord"

export type TerraContracts = Record<ContractNames, AccAddress>
export const useTerraContracts = () => {
  return useMoneiesAssetsByNetwork<TerraContracts>("contracts.json")
}

*/

/* helpers */

const sortWhitelistCW20 = (data: CW20Whitelist) => {
  const sorted = toPairs(data).sort(
    ([, a], [, b]) =>
      Number(b.symbol === "ANC") - Number(a.symbol === "ANC") ||
      Number(b.protocol === "Anchor") - Number(a.protocol === "Anchor") ||
      Number(b.symbol === "MIR") - Number(a.symbol === "MIR") ||
      Number(b.protocol === "Mirror") - Number(a.protocol === "Mirror")
  )

  return fromPairs(
    sorted.map(([t, { decimals, ...item }]) => {
      return [t, { ...item, decimals: decimals ?? 6 }]
    })
  )
}

export const shuffleByProtocol = <T extends CW20Whitelist | CW721Whitelist>(
  array: T
) => {
  const shuffledPair = shuffle(
    toPairs(
      groupBy(([, { protocol, name }]) => protocol ?? name, toPairs(array))
    )
  )

  return mergeAll(flatten(map(fromPairs, values(fromPairs(shuffledPair)))))
}