import { test, run } from 'node:test';
import assert from 'node:assert';
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
import { Access, Provider, Space, Voucher } from '@web3-storage/capabilities';
import { bytesToDelegations } from '@web3-storage/access/encoding';
import { staging } from './web3-storage.js';
import { createSampleDelegation, readSignerFromEnv, warnIfError } from './ucanto-utils.js';
import { readEmailAddressFromEnv } from './email.js';
import { DidMailto } from './did-mailto.js';
import { info } from '@web3-storage/capabilities/space';

const registeredSpace = await readSignerFromEnv(process.env, 'REGISTERED_SPACE_SIGNER')
const tester = await ed25519.generate()
const testerEmail = await readEmailAddressFromEnv(process.env, 'W3S_EMAIL')

for (const web3Storage of [staging]) {
  test('can space/info with=registeredSpace iss=registeredSpace', async () => {
    const spaceInfoResult = await info.invoke({
      issuer: registeredSpace,
      audience: web3Storage.id,
      with: registeredSpace.did(),
    }).execute(web3Storage)
    console.log({ spaceInfoResult })
    throw new Error('WIP')
  })
}
