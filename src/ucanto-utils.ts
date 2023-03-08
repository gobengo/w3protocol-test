import * as ed25519 from '@ucanto/principal/ed25519';
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core';

export async function readSignerFromEnv(
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

export function warnIfError(result: Ucanto.Result<unknown, { error: true }>) {
  if (result && 'error' in result) {
    console.warn('error result', result)
  }
}

export async function createSampleDelegation() {
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
