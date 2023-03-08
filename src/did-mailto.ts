import { EmailAddress } from "./email";

// https://github.com/ucan-wg/did-mailto/
export class DidMailto {
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
