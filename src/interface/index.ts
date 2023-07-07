import { Node } from '@babel/types'

export type KeyofObject<T extends Record<string, any>> = {
  [K in keyof T]: T[K]
}

export type UnionFlowType<T extends Node, Key extends Node['type']> = T extends T ? Key extends T['type'] ? T : never : never;

export function SureFlowType<T, U extends T>(params: T): params is U {
  return !!(params as U)
}