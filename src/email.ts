
export async function readEmailAddressFromEnv(env: Record<string,string|undefined>, varName: string) {
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

export class EmailAddress {
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
