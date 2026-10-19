export const SITE_URL = "https://nester.finance";
export const RISK_DISCLOSURES_URL =
  "https://github.com/Suncrest-Labs/nester/blob/main/docs/security/mainnet-risk-disclosures.md";

export interface NetworkBannerCopy {
  message: string;
  links: { label: string; href: string }[];
}

export const NETWORK_BANNER_COPY: Record<"testnet" | "mainnet", NetworkBannerCopy> = {
  testnet: {
    message: "You are on Testnet — tokens have no real value",
    links: [],
  },
  mainnet: {
    message:
      "You are on Mainnet — real funds. Smart contract risk applies, check the vault cap before depositing, and transactions are irreversible.",
    links: [
      { label: "Security", href: `${SITE_URL}/security` },
      { label: "Risk disclosures", href: RISK_DISCLOSURES_URL },
      { label: "Terms", href: `${SITE_URL}/terms` },
    ],
  },
};
