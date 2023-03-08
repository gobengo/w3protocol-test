import * as upload from '@web3-storage/upload-client'
import * as ed25519 from '@ucanto/principal/ed25519';
import { BlobLike } from '@web3-storage/upload-client/types';
import * as stream from 'node:stream/web'
import Ucanto, { Principal } from '@ucanto/interface';
import * as validator from '@ucanto/validator';
import * as UCAN from '@ipld/dag-ucan'
import type * as UploadClientTypes from '@web3-storage/upload-client/types'
import * as HTTP from '@ucanto/transport/http'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as ucanto from '@ucanto/core'
import * as Client from '@ucanto/client'

export const production = createHttpConnection(
  'did:web:web3.storage' as const,
  new URL('https://access.web3.storage'),
)
export const staging = createHttpConnection(
  'did:web:staging.web3.storage' as const,
  new URL('https://w3access-staging.protocol-labs.workers.dev'),
)

export function createHttpConnection<S extends Record<string,any>>(audience: Ucanto.UCAN.DID, url: URL) {
  return Client.connect({
    id: {
      did: () => audience
    },
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open<S>({
      url,
      fetch: globalThis.fetch,
    })
  })
}
