import { test, run } from 'node:test';
import assert from 'node:assert';
import * as upload from '@web3-storage/upload-client'
import * as ed25519 from '@ucanto/principal/ed25519';
import { BlobLike } from '@web3-storage/upload-client/types';
import * as stream from 'node:stream/web'
import Ucanto from '@ucanto/interface';
import * as validator from '@ucanto/validator';
import * as UCAN from '@ipld/dag-ucan'
import type * as UploadClientTypes from '@web3-storage/upload-client/types'
import * as HTTP from '@ucanto/transport/http'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as ucanto from '@ucanto/core'
import * as Client from '@ucanto/client'
import { Access, Space, Voucher } from '@web3-storage/capabilities';

test('can list items in a space', {}, async t => {
  const space = await ed25519.generate();
  const alice = await ed25519.generate();
  const aliceCanManageSpace = await ucanto.delegate({
    issuer: space,
    audience: alice,
    capabilities: [
      {
        can: 'store/list',
        with: space.did(),
      }
    ],
    expiration: Infinity,
  })
  const cases: Array<{
    audience: Ucanto.UCAN.DID,
    url: URL,
  }> = [
    // staging invoke via staging upload api
    {
      audience: `did:web:staging.web3.storage`,
      url: new URL('https://staging.up.web3.storage'),
    },
    // staging invoke via staging access api
    {
      audience: `did:web:staging.web3.storage`,
      url: new URL('https://w3access-staging.protocol-labs.workers.dev'),
    },
    // production invoke via production upload api
    {
      audience: `did:web:web3.storage`,
      url: new URL('https://up.web3.storage'),
    },
    // production invoke via production access api
    {
      audience: `did:web:web3.storage`,
      url: new URL('https://access.web3.storage'),
    },
  ]
  const caseErrors = [];
  for (const testCase of cases) {
    console.log(`testing aud=${testCase.audience.toString()} url=${testCase.url.toString()}`)
    const connection = createHttpConnection<any>(
      testCase.audience,
      testCase.url,
    )
    const listResult = await Client
      .invoke({
        issuer: alice,
        audience: { did: () => testCase.audience },
        capability: {
          can: 'store/list',
          with: space.did(),
          nb: {},
        },
        proofs: [aliceCanManageSpace],
      })
      .execute(connection);
    try {
      assert.deepEqual('error' in listResult, false, 'store/list result should not be an error')
      assert.notDeepEqual((listResult as any).name, 'HandlerExecutionError', `store/list result should not be a HandlerExecutionError`)
      // assert expected store/list success
      assert.deepEqual(listResult, {
        size: 0,
        results: [],
      }, 'store/list invocation result is expected success type (for empty space)')
    } catch (error) {
      console.warn(`unexpected result from store/list invocation aud=${testCase.audience} url=${testCase.url}`, listResult);
      caseErrors.push({ testCase, error });
    }
  }
  assert.equal(caseErrors.length, 0, 'no cases resulted in an error')
})


test(`new space can invoke space/info for itself, but gets an UnknownSpaceError because it's not known by the access-api yet`, {}, async (t) => {
  const w3 = createHttpConnection(
    'did:web:web3.storage' as const,
    new URL('https://access.web3.storage'),
  )
  const space = await ed25519.generate();
  const spaceInfoResults = await w3.execute(Client.invoke({
    issuer: space,
    audience: w3.id,
    capability: {
      can: 'space/info',
      with: space.did(),
      nb: {},
    },
    proofs: [],
  }));
  assert.equal(spaceInfoResults.length, 1, 'space/info invocation should only return one result')
  const spaceInfoResult = spaceInfoResults[0];
  try {
    if ('error' in spaceInfoResult) {
      assert.ok('name' in spaceInfoResult && typeof spaceInfoResult.name === 'string', `error result is named`)
      assert.notDeepEqual(spaceInfoResult.name, 'Error', 'error name is more specific than "Error", including info that the client can use to if they want to resolve the error')
      assert.deepEqual(spaceInfoResult.name, 'SpaceUnknown', 'error name is SpaceUnknown')
    } else {
      // result seems relatively undocumented, but pulled this assertion from access-api space/info tests https://github.com/web3-storage/w3protocol/blob/1bacd544da803c43cf85043ecdada4dee2b3e2d3/packages/access-api/test/space-info.test.js#L60
      assert.equal('did' in spaceInfoResult && spaceInfoResult.did, space.did(), 'space/info success result has did property that matches space did')
    }
  } catch (error) {
    console.warn('unexpected result from space/info invocation', spaceInfoResult);
    throw error;
  }
})

test('can delegate space/info for a space', {}, async (t) => {
  const w3 = createHttpConnection(
    'did:web:web3.storage' as const,
    new URL('https://access.web3.storage'),
  )
  const space = await ed25519.generate();
  const alice = await ed25519.generate();
  const aliceCanSpaceInfo = await ucanto.delegate({
    issuer: space,
    audience: alice,
    capabilities: [
      {
        can: 'space/info',
        with: space.did(),
      }
    ],
    expiration: Infinity,
  });
  const aliceSpaceInfoInvocation = await Client.invoke({
    issuer: alice,
    audience: w3.id,
    capability: {
      can: 'space/info',
      with: space.did(),
      nb: {},
    },
    proofs: [aliceCanSpaceInfo],
  })
  const spaceInfoResults = await w3.execute(aliceSpaceInfoInvocation);
  assert.equal(spaceInfoResults.length, 1, 'space/info invocation should only return one result')
  const spaceInfoResult = spaceInfoResults[0];
  try {
    if ('error' in spaceInfoResult) {
      assert.ok('name' in spaceInfoResult && typeof spaceInfoResult.name === 'string', `error result is named`)
      assert.notDeepEqual(spaceInfoResult.name, 'Error', 'error name is more specific than "Error", including info that the client can use to if they want to resolve the error')
    } else {
      // result seems relatively undocumented, but pulled this assertion from access-api space/info tests https://github.com/web3-storage/w3protocol/blob/1bacd544da803c43cf85043ecdada4dee2b3e2d3/packages/access-api/test/space-info.test.js#L60
      assert.equal('did' in spaceInfoResult && spaceInfoResult.did, space.did(), 'space/info success result has did property that matches space did')
    }
  } catch (error) {
    console.warn('unexpected result from space/info invocation', spaceInfoResult);
    throw error;
  }
})

// skipped for now while we know it doesn't work
// (it gets an ambiguous Error because the space isnt registered)
test('w3protocol-test can upload file', { skip: true }, async (t) => {
  const space = await ed25519.generate();
  const alice = await ed25519.generate();
  console.log({
    alice: alice.did(),
    space: space.did(),
  })
  const aliceCanManageSpace = await ucanto.delegate({
    issuer: space,
    audience: alice,
    capabilities: [
      {
        can: 'store/*',
        with: space.did(),
      }
    ],
    expiration: Infinity,
  })
  const file: BlobLike = new Blob(['hello world'], { type: 'text/plain' });
  const connection = createHttpConnection(
    `did:web:staging.web3.storage`,
    new URL('https://w3access-staging.protocol-labs.workers.dev'),
  )
  let uploadResult;
  try {
    uploadResult = await upload.uploadFile(
      {
        issuer: alice,
        audience: connection.id,
        with: space.did(),
        proofs: [
          aliceCanManageSpace,
        ],
      },
      file,
      {
        connection: connection as Ucanto.ConnectionView<any>
      }
    );
  } catch (error) {
    console.warn('error uploading file')
    if (error && typeof error === 'object' && 'cause' in error) {
      console.warn('error cause', error.cause);
    }
    throw error;
  }
  console.log('uploaded', uploadResult)
  assert.ok(uploadResult, 'upload returned a truthy object')
})

function createHttpConnection<S extends Record<string,any>>(audience: Ucanto.UCAN.DID, url: URL) {
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

test('can create access/claim invocations', async () => {
  const issuer = await ed25519.generate();
  const audience = await ed25519.generate();
  const invocation = await Access.claim.invoke({
    issuer,
    audience,
    with: issuer.did(),
  }).delegate()
  assert.ok(invocation.cid, 'invocation.cid is truthy')
  
  
  const authorization = await validator.access(invocation, {
    capability: Access.claim,
    principal: ed25519.Verifier,
    authority: audience,
  })
  assert.notDeepEqual(authorization.error, true, 'access did not result in error')
})

test('can create access/delegate invocations', async () => {
  const issuer = await ed25519.generate();
  const audience = await ed25519.generate();
  const delegation = await createSampleDelegation();
  const invocation = await Access.delegate.invoke({
    issuer,
    audience,
    with: issuer.did(),
    nb: {
      delegations: {
        shouldBeACid: delegation.cid
      }
    },
    proofs: [delegation]
  }).delegate()
  assert.ok(invocation.cid, 'invocation.cid is truthy')

  const authorization = await validator.access(invocation, {
    capability: Access.delegate,
    principal: ed25519.Verifier,
    authority: audience,
  })
  assert.notDeepEqual(authorization.error, true, 'access did not result in error')
})

async function createSampleDelegation() {
  return ucanto.delegate({
    issuer: await ed25519.generate(),
    audience: await ed25519.generate(),
    capabilities: [
      {
        can: 'test/*',
        with: 'urn:*'
      }
    ]
  })
}

function w3s() {
  const production = createHttpConnection(
    'did:web:web3.storage' as const,
    new URL('https://access.web3.storage'),
  )
  const staging = createHttpConnection(
    'did:web:staging.web3.storage' as const,
    new URL('https://w3access-staging.protocol-labs.workers.dev'),
  )
  return {
    staging,
    ...production,
  }
}

class EmailAddress {
  static from(email: string) {
    try {
      const [local, domain] = email.split('@');
      if ( ! local) throw new Error(`local part of email address is required, but got ${local}`)
      if ( ! domain) throw new Error(`comain part of email address is required, but got ${domain}`)  
      return new EmailAddress(local, domain);
    } catch (error) {
      throw new Error(`unable to create EmailAddress from ${email}`)
    }
  }
  constructor(
    public local: string,
    public domain: string,
  ) {}
  toString() {
    return `${encodeURIComponent(this.local)}@${encodeURIComponent(this.domain)}`
  }
}

// https://github.com/ucan-wg/did-mailto/
class DidMailto {
  constructor(
    public domain: string,
    public local: string,
  ) {
  }
  toDid(): `did:mailto:${string}:${string}` {
    return `did:mailto:${encodeURIComponent(this.domain)}:${encodeURIComponent(this.local)}`
  }
  toString() {
    return this.toDid()
  }
  static fromEmail(email: EmailAddress) {
    return new DidMailto(email.domain, email.local);
  }
}

test('can invoke access/authorize against staging', async () => {
  const w3 = w3s().staging;
  const issuer = await ed25519.generate();
  const authorizeAsEmail = await readEmailAddressFromEnv(process.env, 'W3S_EMAIL');
  const invocation = await Access.authorize.invoke({
    issuer,
    audience: w3.id,
    with: issuer.did(),
    nb: {
      as: DidMailto.fromEmail(authorizeAsEmail).toString(),
    }
  }).delegate()
  const [result]  = await w3.execute(invocation);
  assert.deepEqual(result, null, 'access/authorize result is null')
  warnIfError(result)
})

test('can use registered space', { only: true }, async () => {
  const w3 = w3s().staging;
  console.warn(`'REGISTERED_SPACE_SIGNER' in process.env`, 'REGISTERED_SPACE_SIGNER' in process.env)
  const registeredSpace = await readSignerFromEnv(process.env, 'REGISTERED_SPACE_SIGNER')
  const delegate = Access.delegate.invoke({
    issuer: registeredSpace,
    audience: w3.id,
    with: registeredSpace.did(),
    nb: {
      delegations: {},
    }
  })
  // ty to access/delegate as a way of testing that the space is registered
  const [delegateResult] = await w3.execute(delegate)
  console.log('delegateResult', delegateResult)
  if ('name' in delegateResult && ((delegateResult as any).name === 'InsufficientStorage')) {
    console.warn(`space ${registeredSpace.did()} is not registered.`)
    // try to register space
    await registerSpaceViaAccessAuthorize(
      registeredSpace,
      w3,
      await readEmailAddressFromEnv(process.env, 'W3S_EMAIL'),
    )
  } else {
    assert.notDeepEqual(delegateResult.error, true, 'delegate result is not an error')
  }
})

/**
 * attempt to register a space via voucher/claim invocation
 */
async function registerSpaceViaVoucherClaim(
  registeredSpace: ed25519.Signer.EdSigner,
  connection: Ucanto.ConnectionView<Record<string,any>>,
  email: EmailAddress
) {
  const claim = Voucher.claim.invoke({
    issuer: registeredSpace,
    audience: connection.id,
    with: registeredSpace.did(),
    nb: {
      product: 'product:free',
      identity: `mailto:${email.toString()}` as Ucanto.URI<'mailto:'>,
      service: connection.id.did(),
    }
  })
  const [claimResult] = await connection.execute(claim)
  throw new Error(`click link in email ${email.toString()} to register space ${registeredSpace.did()} using voucher`)
}

/**
 * attempt to register a space via access/authorize invocation
 */
async function registerSpaceViaAccessAuthorize(
  registeredSpace: ed25519.Signer.EdSigner,
  connection: Ucanto.ConnectionView<Record<string,any>>,
  email: EmailAddress
) {
  const authorize = Access.authorize.invoke({
    issuer: registeredSpace,
    audience: connection.id,
    with: registeredSpace.did(),
    nb: {
      as: DidMailto.fromEmail(email).toString(),
    }
  })
  const [authorizeResult] = await connection.execute(authorize)
  console.warn('authorizeResult', authorizeResult)
  throw new Error(`click link in email ${email.toString()} to register space ${registeredSpace.did()}`)
}

async function readEmailAddressFromEnv(env: Record<string,string|undefined>, varName: string) {
  console.warn(`'${varName}' in env`, `${varName}` in env)
  const email = await Promise.resolve((async () => {
    const email = env[varName];
    if (!email) throw new Error(`env.${varName} is required to run this test, but got ${JSON.stringify(email)}`)
    try {
      return EmailAddress.from(email)
    } catch (error) {
      throw new Error(`unable to parse env.${varName} as EmailAddress: ${env[varName]}`)
    }
  })());
  return email
}

async function readSignerFromEnv(
  env: Record<string,string|undefined>,
  varName: string
): Promise<ed25519.Signer.EdSigner> {
  const signer = await Promise.resolve((async () => {
    const signerFormatted = process.env[varName]
    if ( ! signerFormatted) {
      throw new Error(`env.${varName} is required to run this test, but got ${JSON.stringify(signerFormatted)}`)
    }
    try {
      return ed25519.Signer.parse(signerFormatted)
    } catch (error) {
      throw new Error(`unable to parse env.${varName} as ed25519.Signer: ${signerFormatted}`)
    }
  })());
  return signer
}

test('can invoke access/delegate', async () => {
  const w3 = w3s().staging;
  const issuer = await ed25519.generate();
  const delegation = await createSampleDelegation();
  const delegate = await Access.delegate.invoke({
      issuer,
      audience: w3.id,
      with: issuer.did(),
      nb: {
        delegations: {
          shouldBeACid: delegation.cid
        }
      },
      proofs: [delegation]
    }).delegate()
  const [result] = await w3.execute(delegate);
  warnIfError(result)
  assert.ok(result.error)
  // this is 'good'. The only reason it's an error is the space hasn't been 'registered'
  // via email confirmation
  assert.deepEqual('name' in result && result.name, 'InsufficientStorage', 'access/delegate result is InsufficientStorage')
  // assert.notDeepEqual(result.error, true, 'access/delegate result is not an error')
})

test('can invoke access/claim', { skip: true }, async () => {
  const w3 = w3s().staging;
  const issuer = await ed25519.generate();
  const delegate = await Access.claim.invoke({
      issuer,
      audience: w3.id,
      with: issuer.did(),
      proofs: []
    }).delegate()
  const [result] = await w3.execute(delegate);
  warnIfError(result)
  assert.notDeepEqual(result.error, true, 'access/delegate result is not an error')
})


function warnIfError(result: Ucanto.Result<unknown, { error: true }>) {
  if (result && 'error' in result) {
    console.warn('error result', result)
  }
}
