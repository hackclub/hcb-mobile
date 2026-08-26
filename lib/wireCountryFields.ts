// Ported from hcb/app/models/concerns/has_wire_recipient.rb — keep in sync with that file.
// Defines the additional recipient_information fields Column requires for
// international wires, based on the recipient's bank country.

// Ported from Event.countries_for_select (app/models/concerns/country_enumable.rb):
// every country in the CountryEnumable enum, sorted by common name, with US
// and Canada pinned to the top.
export const WIRE_COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AF", name: "Afghanistan" },
  { code: "AX", name: "Åland Islands" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AI", name: "Anguilla" },
  { code: "AQ", name: "Antarctica" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BV", name: "Bouvet Island" },
  { code: "BR", name: "Brazil" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "BN", name: "Brunei Darussalam" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "KY", name: "Cayman Islands" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CX", name: "Christmas Island" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo, The Democratic Republic of the" },
  { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CW", name: "Curaçao" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands (Malvinas)" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" },
  { code: "TF", name: "French Southern Territories" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" },
  { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" },
  { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HM", name: "Heard Island and McDonald Islands" },
  { code: "VA", name: "Holy See (Vatican City State)" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Lao People's Democratic Republic" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "YT", name: "Mayotte" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia, Federated States of" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NC", name: "New Caledonia" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NU", name: "Niue" },
  { code: "NF", name: "Norfolk Island" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine, State of" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PN", name: "Pitcairn" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "QA", name: "Qatar" },
  { code: "RE", name: "Réunion" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russian Federation" },
  { code: "RW", name: "Rwanda" },
  { code: "BL", name: "Saint Barthélemy" },
  { code: "SH", name: "Saint Helena, Ascension and Tristan da Cunha" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "MF", name: "Saint Martin (French part)" },
  { code: "PM", name: "Saint Pierre and Miquelon" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SX", name: "Sint Maarten (Dutch part)" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SJ", name: "Svalbard and Jan Mayen" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syrian Arab Republic" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Türkiye" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TC", name: "Turks and Caicos Islands" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "UM", name: "United States Minor Outlying Islands" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "VG", name: "Virgin Islands, British" },
  { code: "VI", name: "Virgin Islands, U.S." },
  { code: "WF", name: "Wallis and Futuna" },
  { code: "EH", name: "Western Sahara" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

export type WireCountryField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  description?: string;
  referTo?: string;
  options?: Record<string, string>;
};

export const LEGAL_TYPE_FIELD: WireCountryField = {
  type: "select",
  key: "legal_type",
  label: "Legal status of receiving entity",
  options: {
    Business: "business",
    Nonprofit: "non_profit",
    Individual: "individual",
    "Sole proprietor": "sole_proprietor",
  },
};

// country can be null/empty, in which case only the general fields apply.
export function informationRequiredFor(
  country: string | null | undefined,
): WireCountryField[] {
  const fields: WireCountryField[] = [];

  switch (country) {
    case "BR":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      fields.push({
        type: "text",
        key: "email",
        label: "Email address associated with account",
      });
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "11-digit CPF for individuals, or 14-digit CNPJ for corporations/NGO/organizations",
      });
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      break;
    case "BH":
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 3-character purpose of payment code.",
        referTo:
          "https://cbben.thomsonreuters.com/rulebook/mandating-use-purpose-codes-swift-cross-border-payments4-january-2021",
      });
      break;
    case "CL":
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description: "9-digit RUT tax ID",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 5-digit purpose of payment code.",
        referTo:
          "https://www.bcentral.cl/documents/33528/133521/Manual+de+Procedimientos+y+Formularios+de+Informaci%C3%B3n+del+CN%20CI.pdf/bcdfb774-330a-c6e1-b9fd-1b5e2c078426?t=1583165824643",
      });
      break;
    case "CO":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      fields.push({
        type: "text",
        key: "email",
        label: "Email address associated with account",
      });
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "7-11 digits Cédulas for individuals, or 10-digit NIT for corporations/NGO/organizations",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Payment purpose",
        description:
          "A clearly identifiable purpose of payment (e.g., goods, services, capital, etc.)",
      });
      break;
    case "DO":
      fields.push({
        type: "text",
        key: "account_type",
        label: "Account type",
      });
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "11-digit Cedula or passport number for individuals, or 7+ digits tax ID or 9+ digits Registro Mercantil for corporations/NGO/organizations",
      });
      break;
    case "HN":
      fields.push({
        type: "text",
        key: "account_type",
        label: "Account type",
      });
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "13-digit Tarjeta de Identidad for individuals, or 14-digit Registro Tributario Nacional for corporations/NGO/organizations",
      });
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "For payments from corporations/organizations to individuals, include a detailed purpose of payment (especially for salaries)",
      });
      break;
    case "KZ":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "12-digit Business Identification Number (BIN) or Individual Identification Number (IIN)",
      });
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Payment purpose",
        description: "A 10-character EKNP purpose code",
      });
      break;
    case "MD":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      break;
    case "MY":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 5-digit purpose of payment code.",
        referTo:
          "https://connect-content.us.hsbc.com/hsbc_pcm/onetime/17_july_my_pop_codes.pdf",
      });
      break;
    case "PK":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "Should be prepended with CNIC, SNIC, Passport, or NTN depending on the ID type.",
      });
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "Relationship between remitter and beneficiary must be clearly identified",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 4-digit purpose of payment code.",
        referTo: "https://www.sbp.org.pk/fe_returns/cod5.pdf",
      });
      break;
    case "PY":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "Cedula de Identidad for individuals, or RUC for corporations",
      });
      break;
    case "AM":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      break;
    case "AR":
      fields.push({
        type: "text",
        key: "email",
        label: "Email address associated with account",
      });
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "11-digit CUIL for individuals, or 11-digit CUIT for corporations",
      });
      break;
    case "AE":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 3-character purpose of payment code.",
        referTo:
          "https://www.centralbank.ae/media/ipaifsll/bop-purposeofpaymentcodestable-en-18092017.pdf",
      });
      break;
    case "AL":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "For utility payments: client name, bill month, and contract number of the subscriber. For tax payments: FDP (payment order document generated by Tax Office system). For fee payments: NIPT (tax ID).",
      });
      break;
    case "AU":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "6-digit BSB code",
      });
      break;
    case "AZ":
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description: "10-digit TIN/VOEN",
      });
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "6-digit BIK code",
      });
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "Payment purpose must be clearly identified, especially for charitable purposes to avoid income tax",
      });
      break;
    case "BA":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "If the beneficiary belongs to a government organization, Budget Organization Code, Profit Type (6-digit) and Citation Number (municipality, 3-digit) are required",
      });
      break;
    case "BG":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "For tax payments: 6-digit payment type defined by the Ministry of Finance and local regulation, and one of the following: BULSTAT (Bulgarian Identification Tax Number, 6-digit for corporations), EGN (Bulgarian citizen ID), PNF (foreign citizen ID), or IZL (name of legal entity or individual)",
      });
      break;
    case "BD":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "9-digit bank routing code",
      });
      break;
    case "BY":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "3-9 digits MFO bank code",
      });
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description: "Tax ID",
      });
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      break;
    case "BZ":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "5-digit branch code",
      });
      break;
    case "BS":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "Transit Number is required if the beneficiary bank is RBC Bahamas",
      });
      break;
    case "CA":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "9-digit Canadian Payments Association Routing Number",
      });
      break;
    case "CM":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      break;
    case "CN":
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description:
          "CAP (Capital Account), GDS (Goods Trade), SRV (Service Trade), CAC (Current Account), or FTF (Bank to Bank Funds Transfer)",
      });
      break;
    case "CR":
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description: "9-12 digits Cedula Juridica",
      });
      fields.push({
        type: "text",
        key: "local_account_number",
        label: "Local account number",
        description: "17-digit Cuenta Cliente",
      });
      break;
    case "DZ":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "For invoices: reason for the invoice (e.g., invoice for health services). Otherwise provide a general reason for payment.",
      });
      break;
    case "GY":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "8-digit Transit Code is mandatory (format: TRANSIT CODE: XXXXXXXX). Funds paid to the Guyana Revenue Authority requires a reference (format: YYMMDD/RRRRRRRRRRRR), which can be obtained from the Guyana Revenue Authority.",
      });
      break;
    case "ID":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      break;
    case "IN":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "11-character IFSC codes",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description:
          "A 5-character purpose of payment code, beginning with 'P'.",
        referTo:
          "https://cdn.hackclub.com/019ecca2-62ce-75c8-a16a-40e2d557434e/ASAP840212FL.pdf",
      });
      break;
    case "JO":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 4-digit purpose of payment code.",
        referTo:
          "https://www.cbj.gov.jo/EchoBusv3.0/SystemAssets/PDFs/1%D8%A7%D9%84%D8%BA%D8%B1%D8%B6%20%D9%85%D9%86%20%D8%A7%D9%84%D8%AA%D8%AD%D9%88%D9%8A%D9%84%D8%A7%D8%AA%200%D8%A7%D9%84%D9%85%D8%A7%D9%84%D9%8A%D8%A9-20191029.pdf",
      });
      break;
    case "KG":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "6-digit BIK code",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 8-digit purpose of payment code",
      });
      break;
    case "KR":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description: "10-digit Business Registration Number (for corporations)",
      });
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 5-digit purpose of payment code.",
        referTo:
          "https://www.jpmorgan.com/directdoc/list-of-payment-purpose-code-kr.pdf",
      });
      break;
    case "MU":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      break;
    case "MM":
      fields.push({
        type: "textarea",
        key: "purpose_code",
        label: "Purpose code",
        description: "A 4-digit ITRS code",
      });
      break;
    case "MX":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "Nostro Account Number",
      });
      break;
    case "MZ":
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description: "9-digit NUIT: Taxpayer Single ID Number",
      });
      break;
    case "NE":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      break;
    case "NP":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "9-digit Permanent Account Number (PAN) is required for (i) payments related to social media content and software development by individuals or corporations or equivalent and (ii) payments related to any consultancy services would apply to individual only.",
      });
      break;
    case "NZ":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "6-digit NZ Clearing Code",
      });
      break;
    case "PE":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "11-digit RUC number for corporations, or 8-digit DNI for individuals",
      });
      break;
    case "TG":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      break;
    case "TW":
      fields.push({
        type: "text",
        key: "phone",
        label: "Phone number associated with account",
      });
      break;
    case "UA":
      fields.push(LEGAL_TYPE_FIELD);
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description:
          "10-digit tax ID for individuals, or 8-digit tax ID for corporations/NGO/organizations",
      });
      break;
    case "UG":
      fields.push({
        type: "text",
        key: "legal_id",
        label: "Legal ID of receiving entity",
        description: "13-digit PRN tax ID",
      });
      break;
    case "SA":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description: "Payment purpose must be clearly identified",
      });
      break;
    case "ZM":
      fields.push({
        type: "text",
        key: "local_bank_code",
        label: "Local bank code",
        description: "6-digit branch code",
      });
      break;
    case "ZA":
      fields.push({
        type: "textarea",
        key: "remittance_info",
        label: "Remittance information",
        description:
          "For tax payments, include unique 19 character Payment Reference Number(PRN) (e.g., /PRN/xxxxxxxxxxxxxxxxxxx)",
      });
      break;
    default:
      break;
  }

  return fields;
}

// IBAN & postal code formats sourced from
// https://column.com/docs/international-wires/country-specific-details
export const IBAN_FORMATS: Record<string, RegExp> = {
  AD: /^AD\d{2}\d{4}\d{4}[\dA-Za-z]{12}/,
  AE: /^AE\d{2}\d{3}\d{16}/,
  AL: /^AL\d{2}\d{8}[\dA-Za-z]{16}/,
  AT: /^AT\d{2}\d{5}\d{11}/,
  AZ: /^AZ\d{2}[A-Z]{4}[\dA-Za-z]{20}/,
  BA: /^BA\d{2}\d{3}\d{3}\d{8}\d{2}/,
  BE: /^BE\d{2}\d{3}\d{7}\d{2}/,
  BG: /^BG\d{2}[A-Z]{4}\d{4}\d{2}[\dA-Za-z]{8}/,
  BH: /^BH\d{2}[A-Z]{4}[\dA-Za-z]{14}/,
  BY: /^BY\d{2}[\dA-Za-z]{4}\d{4}[\dA-Za-z]{16}/,
  CH: /^CH\d{2}\d{5}[\dA-Za-z]{12}/,
  CY: /^CY\d{2}\d{3}\d{5}[\dA-Za-z]{16}/,
  CZ: /^CZ\d{2}\d{4}\d{6}\d{10}/,
  DE: /^DE\d{2}\d{8}\d{10}/,
  DK: /^DK\d{2}\d{4}\d{9}\d/,
  EE: /^EE\d{2}\d{2}\d{2}\d{11}\d/,
  EG: /^EG\d{2}\d{4}\d{4}\d{17}/,
  ES: /^ES\d{2}\d{4}\d{4}\d\d\d{10}/,
  FI: /^FI\d{2}\d{3}\d{11}/,
  FO: /^FO\d{2}\d{4}\d{9}\d/,
  FR: /^FR\d{2}\d{5}\d{5}[\dA-Za-z]{11}\d{2}/,
  GB: /^GB\d{2}[A-Z]{4}\d{6}\d{8}/,
  GE: /^GE\d{2}[A-Z]{2}\d{16}/,
  GI: /^GI\d{2}[A-Z]{4}[\dA-Za-z]{15}/,
  GL: /^GL\d{2}\d{4}\d{9}\d/,
  GR: /^GR\d{2}\d{3}\d{4}[\dA-Za-z]{16}/,
  GT: /^GT\d{2}[\dA-Za-z]{4}[\dA-Za-z]{20}/,
  HR: /^HR\d{2}\d{7}\d{10}/,
  HU: /^HU\d{2}\d{3}\d{4}\d\d{15}\d/,
  IE: /^IE\d{2}[A-Z]{4}\d{6}\d{8}/,
  IQ: /^IQ\d{2}[A-Z]{4}\d{3}\d{12}/,
  IS: /^IS\d{2}\d{4}\d{2}\d{6}\d{10}/,
  IT: /^IT\d{2}[A-Z]\d{5}\d{5}[\dA-Za-z]{12}/,
  JM: /^\d{14}/,
  JO: /^JO\d{2}[A-Z]{4}\d{4}[\dA-Za-z]{18}/,
  KW: /^KW\d{2}[A-Z]{4}[\dA-Za-z]{22}/,
  KZ: /^KZ\d{2}\d{3}[\dA-Za-z]{13}/,
  LB: /^LB\d{2}\d{4}[\dA-Za-z]{20}/,
  LI: /^LI\d{2}\d{5}[\dA-Za-z]{12}/,
  LT: /^LT\d{2}\d{5}\d{11}/,
  LU: /^LU\d{2}\d{3}[\dA-Za-z]{13}/,
  LV: /^LV\d{2}[A-Z]{4}[\dA-Za-z]{13}/,
  MC: /^MC\d{2}\d{5}\d{5}[\dA-Za-z]{11}\d{2}/,
  MD: /^MD\d{2}[\dA-Za-z]{2}[\dA-Za-z]{18}/,
  MT: /^MT\d{2}[A-Z]{4}\d{5}[\dA-Za-z]{18}/,
  MX: /^\d{18}/,
  MZ: /^MZ59\d{21}/,
  NL: /^NL\d{2}[A-Z]{4}\d{10}/,
  NO: /^NO\d{2}\d{4}\d{6}\d/,
  PK: /^PK\d{2}[A-Z]{4}[\dA-Za-z]{16}/,
  PL: /^PL\d{2}\d{8}\d{16}/,
  PS: /^PS\d{2}[A-Z]{4}[\dA-Za-z]{21}/,
  PT: /^PT\d{2}\d{4}\d{4}\d{11}\d{2}/,
  QA: /^QA\d{2}[A-Z]{4}[\dA-Za-z]{21}/,
  RO: /^RO\d{2}[A-Z]{4}[\dA-Za-z]{16}/,
  RS: /^RS\d{2}\d{3}\d{13}\d{2}/,
  SA: /^SA\d{2}\d{2}[\dA-Za-z]{18}/,
  SD: /^SD\d{2}\d{2}\d{12}/,
  SE: /^SE\d{2}\d{3}\d{16}\d/,
  SI: /^SI\d{2}\d{5}\d{8}\d{2}/,
  SK: /^SK\d{2}\d{4}\d{6}\d{10}/,
  SM: /^SM\d{2}[A-Z]\d{5}\d{5}[\dA-Za-z]{12}/,
  TL: /^TL\d{2}\d{3}\d{14}\d{2}/,
  TR: /^TR\d{2}\d{5}\d[\dA-Za-z]{16}/,
  UA: /^UA\d{2}\d{6}[\dA-Za-z]{19}/,
  VA: /^VA\d{2}\d{3}\d{15}/,
  AO: /^AO[\dA-Za-z]{2}\d{21}/,
  AR: /^\d{22}/,
  BF: /^BF[\dA-Za-z]{8}\d{14}/,
  BI: /^BI\d{2}\d{5}\d{5}\d{11}\d{2}/,
  BJ: /^BJ[\dA-Za-z]{8}\d{14}$/,
  BR: /^BR\d{2}\d{8}\d{5}\d{10}[A-Z][\dA-Za-z]/,
  CF: /^\d{23}/,
  CG: /^\d{23}/,
  CI: /^CI[\dA-Za-z]{8}\d{14}/,
  CM: /^(CM\d{2})?\d{23}/,
  CR: /^CR\d{2}0\d{3}\d{14}/,
  DJ: /^DJ\d{2}\d{5}\d{5}\d{11}\d{2}/,
  DO: /^DO\d{2}[A-Z]{4}\d{20}/,
  DZ: /^DZ[\dA-Za-z]{20}/,
  GA: /^\d{23}/,
  GN: /^[\dA-Za-z]{18}/,
  GQ: /^\d{23}/,
  GW: /^GW[\dA-Za-z]{8}\d{14}/,
  IL: /^IL\d{2}\d{3}\d{3}\d{13}/,
  KG: /^\d{16}/,
  LC: /^LC\d{2}[A-Z]{4}[\dA-Za-z]{24}/,
  LY: /^LY\d{2}\d{3}\d{3}\d{15}/,
  MA: /^\d{24}/,
  ME: /^ME\d{2}\d{3}\d{13}\d{2}/,
  MG: /^MG46\d{23}/,
  ML: /^ML[\dA-Za-z]{8}\d{14}/,
  MK: /^MK\d{2}\d{3}[\dA-Za-z]{10}\d{2}/,
  MR: /^MR\d{2}\d{5}\d{5}\d{11}\d{2}/,
  MU: /^MU\d{2}[A-Z]{4}\d{2}\d{2}\d{12}\d{3}[A-Z]{3}/,
  NA: /^\d{8,13}/,
  NE: /^NE[\dA-Za-z]{8}\d{14}$/,
  NG: /^\d{10}/,
  PF: /^FR\d{2}\d{5}\d{5}[\dA-Za-z]{11}\d{2}/,
  RU: /^RU\d{2}\d{9}\d{5}[\dA-Za-z]{15}/,
  SC: /^SC\d{2}[A-Z]{4}\d{2}\d{2}\d{16}[A-Z]{3}/,
  SN: /^SN[\dA-Za-z]{8}\d{14}$/,
  ST: /^ST\d{2}\d{8}\d{11}\d{2}/,
  SV: /^SV\d{2}[A-Z]{4}\d{20}/,
  TD: /^\d{23}/,
  TG: /^TG[\dA-Za-z]{8}\d{14}$/,
  TN: /^TN\d{2}\d{2}\d{3}\d{13}\d{2}/,
  VG: /^VG\d{2}[A-Z]{4}\d{16}/,
  XK: /^XK\d{2}\d{4}\d{10}\d{2}/,
};

export const POSTAL_CODE_FORMATS: Record<string, RegExp> = {
  US: /^\d{5}(?:-\d{4})?$/,
  CN: /^\d{6}$/,
  JP: /^\d{3}-\d{4}$/,
  FR: /^\d{5}$/,
  DE: /^\d{5}$/,
};

// https://www.johndcook.com/blog/2024/01/29/swift/
export const BIC_REGEX = /^[A-Z]{4}([A-Z]{2})[A-Z0-9]{2}([A-Z0-9]{3})?$/;

// Ported from Wire::AVAILABLE_CURRENCIES in has_wire_recipient.rb:
// (EuCentralBank::CURRENCIES + ["EUR"] + WiseTransfer::AVAILABLE_CURRENCIES + ["UGX"]).uniq
export const WIRE_CURRENCIES = [
  "USD",
  "EUR",
  "JPY",
  "BGN",
  "CZK",
  "DKK",
  "GBP",
  "HUF",
  "ILS",
  "ISK",
  "PLN",
  "RON",
  "SEK",
  "CHF",
  "NOK",
  "TRY",
  "AUD",
  "BRL",
  "CAD",
  "CNY",
  "HKD",
  "IDR",
  "INR",
  "KRW",
  "MXN",
  "MYR",
  "NZD",
  "PHP",
  "SGD",
  "THB",
  "ZAR",
  "AED",
  "ARS",
  "CLP",
  "COP",
  "EGP",
  "GEL",
  "KES",
  "LKR",
  "MAD",
  "NGN",
  "NPR",
  "PKR",
  "TND",
  "UAH",
  "UYU",
  "VND",
  "UGX",
];
