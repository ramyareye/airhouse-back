export const maskEmail = (email: string) => {
  const [local = "", domain = ""] = email.split("@");

  if (!domain) return "***";
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;

  return `${local.slice(0, 2)}***@${domain}`;
};

export const maskPhoneNumber = (phoneNumber: string) => {
  if (phoneNumber.length <= 4) return "***";

  return `${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-2)}`;
};
