import { resolveMx, resolveTxt } from "node:dns/promises";

/**
 * Domain e-mail trust (engine 2.1, ADR 0010): MX, SPF, DMARC via DNS only —
 * no request to the target. Answers a business question: "will our letters
 * reach clients, or land in spam / be forged?".
 */

export interface MailCheck {
  /** Domain the records were looked up for (site host without www). */
  domain: string;
  mx: boolean;
  spf: boolean;
  /** DMARC policy: none | quarantine | reject, or null when absent. */
  dmarc: "none" | "quarantine" | "reject" | null;
}

export interface MailResolvers {
  mx: (d: string) => Promise<unknown[]>;
  txt: (d: string) => Promise<string[][]>;
}

const defaultResolvers: MailResolvers = { mx: resolveMx, txt: resolveTxt };

/** Never throws: a failed lookup reads as "record absent". */
export async function checkMail(host: string, resolvers: MailResolvers = defaultResolvers): Promise<MailCheck> {
  const domain = host.toLowerCase().replace(/^www\./, "");
  const txt = async (name: string) => {
    try {
      return (await resolvers.txt(name)).map((parts) => parts.join(""));
    } catch {
      return [];
    }
  };
  const [mxRecords, rootTxt, dmarcTxt] = await Promise.all([
    resolvers.mx(domain).catch(() => []),
    txt(domain),
    txt(`_dmarc.${domain}`),
  ]);
  const dmarcRecord = dmarcTxt.find((t) => /^v=DMARC1/i.test(t.trim()));
  const policy = dmarcRecord?.match(/;\s*p\s*=\s*(none|quarantine|reject)/i)?.[1]?.toLowerCase() as MailCheck["dmarc"] | undefined;
  return {
    domain,
    mx: mxRecords.length > 0,
    spf: rootTxt.some((t) => /^v=spf1\b/i.test(t.trim())),
    dmarc: dmarcRecord ? policy ?? "none" : null,
  };
}
