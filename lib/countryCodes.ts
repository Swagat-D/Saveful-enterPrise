export type CountryCode = {
  iso: string;
  name: string;
  dialCode: string;
  flag: string;
};

const PRIORITY_ISO = ["AU", "IN", "US"] as const;

const ALL_COUNTRIES: CountryCode[] = [
  { iso: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { iso: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { iso: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { iso: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { iso: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { iso: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { iso: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { iso: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { iso: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { iso: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { iso: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { iso: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { iso: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { iso: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { iso: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { iso: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { iso: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { iso: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { iso: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { iso: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { iso: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { iso: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰" },
  { iso: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { iso: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { iso: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { iso: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { iso: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { iso: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { iso: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { iso: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { iso: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { iso: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { iso: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { iso: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { iso: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { iso: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { iso: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
];

export const COUNTRY_CODES: CountryCode[] = [
  ...PRIORITY_ISO.map((iso) => ALL_COUNTRIES.find((item) => item.iso === iso)!),
  ...ALL_COUNTRIES.filter((item) => !PRIORITY_ISO.includes(item.iso as (typeof PRIORITY_ISO)[number])).sort(
    (a, b) => a.name.localeCompare(b.name),
  ),
];

export function findCountryByIso(iso: string) {
  return COUNTRY_CODES.find((item) => item.iso === iso);
}

export function formatMobileWithCountryCode(dialCode: string, nationalNumber: string) {
  const digits = nationalNumber.replace(/\D/g, "");
  const code = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return `${code}${digits}`;
}
