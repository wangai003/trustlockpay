import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * TRUSTLOCK GLOBAL DOCUMENT VERIFICATION REFERENCE LIBRARY
 * 
 * Covers 54 African countries + 30 major global trade partners.
 * Each entry includes: issuing authority, security features to check,
 * common forgery indicators, and verification endpoints (where available).
 * 
 * Document categories:
 * - BUSINESS_REG: Business/Company registration certificates
 * - TAX_CERT: Tax clearance/compliance certificates
 * - GOV_ID: Government-issued identity documents
 * - TRADE_LICENSE: Import/Export licenses
 * - ORIGIN_CERT: Certificates of Origin (CoO)
 * - QUALITY_CERT: Quality/Standards conformity certificates
 * - BANKING: Bank statements, letters of credit
 * - CUSTOMS: Customs declarations, bills of entry
 * - SHIPPING: Bills of lading, airway bills, packing lists
 * - INDUSTRY: Sector-specific (pharma, mining, oil & gas, etc.)
 */

// ═══════════════════════════════════════════════════════════
// AFRICA — ALL 54 COUNTRIES
// ═══════════════════════════════════════════════════════════

const AFRICA: Record<string, any> = {
  // ─── EAST AFRICA ───
  KE: {
    name: "Kenya",
    documents: {
      BUSINESS_REG: {
        name: "Certificate of Incorporation / Business Registration Certificate",
        issuer: "Registrar of Companies / Business Registration Service (BRS)",
        portal: "https://brs.go.ke",
        security_features: [
          "Embossed Republic of Kenya coat of arms",
          "Unique registration number format: PVT-XXXXXXX or CPR/XXXX/XXXX",
          "Registrar's signature and official stamp",
          "Watermarked paper with Kenya national emblem",
          "QR code on newer certificates (post-2020)"
        ],
        forgery_indicators: [
          "Mismatched font between header and body text",
          "Incorrect coat of arms (wrong shield details, missing spears)",
          "Registration number not matching BRS online lookup",
          "Missing or blurred Registrar's stamp",
          "Date format inconsistencies (Kenya uses DD/MM/YYYY)"
        ],
        verify_online: "https://brs.go.ke/verify — Enter registration number to verify"
      },
      TAX_CERT: {
        name: "KRA Tax Compliance Certificate (TCC)",
        issuer: "Kenya Revenue Authority (KRA)",
        portal: "https://itax.kra.go.ke",
        security_features: [
          "KRA logo with eagle emblem",
          "Unique TCC number: format CR/XXXXXXXXXX/XXXX",
          "KRA PIN of the taxpayer clearly displayed",
          "Validity period (typically 12 months)",
          "Commissioner's digital signature",
          "QR code linking to KRA verification portal",
          "iTax watermark background"
        ],
        forgery_indicators: [
          "TCC number doesn't verify on iTax portal",
          "Expired validity dates",
          "KRA PIN format incorrect (should be A0XXXXXXXXA)",
          "Missing QR code on certificates issued after 2019",
          "Wrong commissioner name for the period"
        ],
        verify_online: "https://itax.kra.go.ke/KRA-Portal/ — Use TCC verification module"
      },
      GOV_ID: {
        name: "National ID Card / Passport",
        issuer: "National Registration Bureau / Department of Immigration",
        security_features: [
          "National ID: Laminated card with holographic overlay, ID number format: XXXXXXXX",
          "Huduma Namba (new digital ID): Biometric-linked, NFC chip",
          "Passport: ICAO-compliant, MRZ (machine-readable zone), polycarbonate data page",
          "UV-reactive coat of arms on passport pages"
        ],
        forgery_indicators: [
          "ID number length incorrect (should be 8 digits)",
          "Photo appears pasted rather than printed into card",
          "Hologram missing or doesn't shift color when tilted",
          "MRZ checksum failures on passport"
        ]
      },
      ORIGIN_CERT: {
        name: "Certificate of Origin",
        issuer: "Kenya National Chamber of Commerce & Industry (KNCCI)",
        security_features: [
          "KNCCI official letterhead and stamp",
          "Chamber registration number",
          "Authorized signatory",
          "Serial number for tracking",
          "For AfCFTA: specific AfCFTA-compliant CoO format with Rules of Origin declaration"
        ],
        forgery_indicators: [
          "KNCCI stamp doesn't match known authentic stamps",
          "No serial/reference number",
          "HS codes don't match product description"
        ]
      },
      QUALITY_CERT: {
        name: "KEBS Standards Mark / Diamond Mark of Quality",
        issuer: "Kenya Bureau of Standards (KEBS)",
        portal: "https://www.kebs.org",
        security_features: [
          "KEBS Diamond Mark hologram",
          "ISM (Import Standardization Mark) number",
          "Permit number format: ISM/XXXX/XXXX",
          "KEBS seal with unique serial"
        ],
        forgery_indicators: [
          "Diamond Mark hologram missing or printed flat",
          "ISM number not verifiable on KEBS portal",
          "Test report reference numbers don't match"
        ],
        verify_online: "https://www.kebs.org — Verify ISM permit online"
      }
    }
  },

  UG: {
    name: "Uganda",
    documents: {
      BUSINESS_REG: {
        name: "Certificate of Incorporation",
        issuer: "Uganda Registration Services Bureau (URSB)",
        portal: "https://ursb.go.ug",
        security_features: [
          "URSB official seal with Uganda coat of arms",
          "Registration number format varies by entity type",
          "Registrar General's signature",
          "Watermarked official paper"
        ],
        forgery_indicators: [
          "Coat of arms incorrect (crested crane details wrong)",
          "Registration number not verifiable on URSB portal",
          "Paper quality inconsistent with government-issued documents"
        ],
        verify_online: "https://ursb.go.ug — Online company search"
      },
      TAX_CERT: {
        name: "Tax Clearance Certificate",
        issuer: "Uganda Revenue Authority (URA)",
        portal: "https://ura.go.ug",
        security_features: [
          "URA logo and official header",
          "TIN (Taxpayer Identification Number) format: 10XXXXXXXXX",
          "Digital signature of Commissioner",
          "Validity period stated",
          "QR code for verification (newer certificates)"
        ],
        forgery_indicators: [
          "TIN format wrong (should be 10 digits starting with 10)",
          "URA logo outdated or wrong color scheme",
          "No verification QR code on recent certificates"
        ],
        verify_online: "https://ura.go.ug — TIN verification portal"
      },
      QUALITY_CERT: {
        name: "UNBS Quality Mark",
        issuer: "Uganda National Bureau of Standards (UNBS)",
        security_features: [
          "UNBS quality mark logo",
          "Permit number",
          "Product specification reference",
          "Authorized signatory"
        ],
        forgery_indicators: [
          "UNBS mark looks different from authentic mark",
          "No permit number",
          "Product specifications don't match declared goods"
        ]
      }
    }
  },

  TZ: {
    name: "Tanzania",
    documents: {
      BUSINESS_REG: {
        name: "Certificate of Incorporation / Business License",
        issuer: "Business Registrations and Licensing Agency (BRELA)",
        portal: "https://ors.brela.go.tz",
        security_features: [
          "BRELA official stamp",
          "Company registration number",
          "Registrar's signature",
          "Government watermark"
        ],
        forgery_indicators: [
          "Registration number not found on BRELA ORS",
          "Incorrect BRELA logo",
          "Missing government watermark"
        ],
        verify_online: "https://ors.brela.go.tz — Online Registration System"
      },
      TAX_CERT: {
        name: "TRA Tax Clearance Certificate",
        issuer: "Tanzania Revenue Authority (TRA)",
        portal: "https://www.tra.go.tz",
        security_features: [
          "TRA official logo",
          "TIN format: XXX-XXX-XXX",
          "Commissioner's signature",
          "Validity period"
        ],
        forgery_indicators: [
          "TIN format incorrect",
          "TRA logo wrong version",
          "Validity dates suspicious"
        ]
      },
      QUALITY_CERT: {
        name: "TBS Standards Mark",
        issuer: "Tanzania Bureau of Standards (TBS)",
        security_features: [
          "TBS mark of quality",
          "Permit number",
          "Product category reference"
        ],
        forgery_indicators: ["Missing TBS mark", "No permit reference", "Wrong product categorization"]
      }
    }
  },

  RW: {
    name: "Rwanda",
    documents: {
      BUSINESS_REG: {
        name: "Company Registration Certificate",
        issuer: "Rwanda Development Board (RDB)",
        portal: "https://org.rdb.rw",
        security_features: [
          "RDB official digital certificate",
          "TIN automatically assigned at registration",
          "Fully digital — no physical certificates issued since 2018",
          "QR code verification"
        ],
        forgery_indicators: [
          "Physical paper certificate claiming to be recent",
          "No QR code",
          "TIN not verifiable on RDB portal"
        ],
        verify_online: "https://org.rdb.rw — Fully digital verification"
      },
      TAX_CERT: {
        name: "RRA Tax Clearance",
        issuer: "Rwanda Revenue Authority (RRA)",
        portal: "https://www.rra.gov.rw",
        security_features: ["RRA digital certificate", "TIN linked to RDB registration", "QR verification"],
        forgery_indicators: ["Not verifiable on RRA e-tax portal", "TIN mismatch"]
      },
      QUALITY_CERT: {
        name: "RSB Standards Mark",
        issuer: "Rwanda Standards Board (RSB)",
        security_features: ["RSB conformity mark", "Certificate number", "Test report reference"],
        forgery_indicators: ["RSB mark inconsistent", "No certificate number"]
      }
    }
  },

  ET: {
    name: "Ethiopia",
    documents: {
      BUSINESS_REG: {
        name: "Commercial Registration Certificate",
        issuer: "Ministry of Trade and Regional Integration",
        security_features: [
          "Federal Democratic Republic of Ethiopia emblem",
          "Business registration number",
          "Amharic and English bilingual text",
          "Ministry seal and authorized signature"
        ],
        forgery_indicators: [
          "Only in one language (should be bilingual)",
          "Emblem incorrect (Lion of Judah was replaced in 1996)",
          "Registration number format inconsistent"
        ]
      },
      TAX_CERT: {
        name: "Tax Clearance Letter",
        issuer: "Ethiopian Revenues and Customs Authority (ERCA) / Ministry of Revenue",
        security_features: ["TIN number", "ERCA official letterhead", "Authorized signature and stamp"],
        forgery_indicators: ["TIN format incorrect", "Outdated ERCA branding (renamed to Ministry of Revenue)"]
      }
    }
  },

  SO: {
    name: "Somalia",
    documents: {
      BUSINESS_REG: {
        name: "Business Registration Certificate",
        issuer: "Ministry of Commerce and Industry",
        security_features: ["Federal Republic of Somalia emblem", "Ministry stamp", "Registration number"],
        forgery_indicators: ["Emblem incorrect (leopard details)", "No ministry stamp", "Issued from unrecognized regional authority without federal endorsement"]
      }
    }
  },

  DJ: {
    name: "Djibouti",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce (Trade Register Certificate)",
        issuer: "Tribunal de Commerce / Ministry of Commerce",
        security_features: ["RC number", "Bilingual French/Arabic", "Court stamp"],
        forgery_indicators: ["Only one language", "No court stamp", "RC number format wrong"]
      }
    }
  },

  ER: {
    name: "Eritrea",
    documents: {
      BUSINESS_REG: {
        name: "Business License",
        issuer: "Ministry of Trade and Industry",
        security_features: ["Government emblem", "License number", "Ministry stamp"],
        forgery_indicators: ["Wrong emblem", "No license number"]
      }
    }
  },

  SS: {
    name: "South Sudan",
    documents: {
      BUSINESS_REG: {
        name: "Certificate of Registration",
        issuer: "Ministry of Justice / Registrar General",
        security_features: ["South Sudan coat of arms (African fish eagle)", "Registrar stamp", "Registration number"],
        forgery_indicators: ["Wrong coat of arms", "No registrar stamp"]
      }
    }
  },

  // ─── WEST AFRICA ───
  NG: {
    name: "Nigeria",
    documents: {
      BUSINESS_REG: {
        name: "Certificate of Incorporation / Business Name Registration",
        issuer: "Corporate Affairs Commission (CAC)",
        portal: "https://www.cac.gov.ng",
        security_features: [
          "CAC official seal with Federal Republic of Nigeria coat of arms",
          "RC (Registration Certificate) number format: RC-XXXXXXX or BN-XXXXXXX",
          "Registrar General's signature",
          "Holographic security sticker (post-2020 certificates)",
          "QR code linking to CAC verification portal"
        ],
        forgery_indicators: [
          "RC number not verifiable on CAC portal",
          "Missing or non-holographic security sticker",
          "Incorrect coat of arms (wrong eagle type or shield)",
          "Old format certificate with no QR code claiming recent date",
          "Registrar General name doesn't match the period"
        ],
        verify_online: "https://search.cac.gov.ng/home — Public search portal"
      },
      TAX_CERT: {
        name: "Tax Clearance Certificate (TCC)",
        issuer: "Federal Inland Revenue Service (FIRS)",
        portal: "https://taxpromax.firs.gov.ng",
        security_features: [
          "FIRS logo and Federal Republic header",
          "TIN (Tax Identification Number) format: XXXXXXXXXX (10 digits)",
          "Chairman's signature",
          "Assessment years clearly stated",
          "Security serial number"
        ],
        forgery_indicators: [
          "TIN doesn't verify on TaxProMax",
          "Wrong FIRS logo version",
          "Assessment years don't match company incorporation date",
          "No security serial number"
        ],
        verify_online: "https://taxpromax.firs.gov.ng — TIN verification"
      },
      GOV_ID: {
        name: "National Identity Card (NIN) / International Passport",
        issuer: "National Identity Management Commission (NIMC) / Nigeria Immigration Service",
        security_features: [
          "NIN slip: 11-digit NIN, NIMC logo, biometric data reference",
          "eID card: Polycarbonate, chip-embedded, holographic overlay",
          "Passport: ECOWAS format, MRZ, polycarbonate data page, UV features"
        ],
        forgery_indicators: [
          "NIN not 11 digits",
          "eID card has no chip or chip doesn't scan",
          "Passport MRZ checksum fails",
          "Photo quality inconsistent with official printing"
        ]
      },
      QUALITY_CERT: {
        name: "SON Conformity Assessment Certificate (SONCAP)",
        issuer: "Standards Organisation of Nigeria (SON)",
        portal: "https://www.son.gov.ng",
        security_features: [
          "SONCAP certificate number",
          "Product Certificate (PC) number",
          "SON mandatory conformity mark",
          "Authorized SON signature"
        ],
        forgery_indicators: [
          "SONCAP number not verifiable",
          "PC number format incorrect",
          "SON mark looks different from authentic version",
          "Missing authorized signature"
        ],
        verify_online: "https://www.son.gov.ng — SONCAP verification"
      },
      INDUSTRY: {
        NAFDAC: {
          name: "NAFDAC Registration Certificate",
          issuer: "National Agency for Food and Drug Administration and Control",
          portal: "https://www.nafdac.gov.ng",
          security_features: [
            "NAFDAC registration number format: XX-XXXX",
            "NAFDAC logo with green border",
            "Director General's signature",
            "Product category code",
            "Holographic seal"
          ],
          forgery_indicators: [
            "Registration number not on NAFDAC green book",
            "Wrong category code for product type",
            "Missing holographic seal",
            "DG name doesn't match tenure period"
          ],
          verify_online: "https://www.nafdac.gov.ng/verification — Product verification portal"
        },
        DPR: {
          name: "DPR/NUPRC License",
          issuer: "Nigerian Upstream Petroleum Regulatory Commission (NUPRC) / formerly DPR",
          security_features: ["License number", "OPL/OML block reference", "Commission seal"],
          forgery_indicators: ["Still references 'DPR' on documents post-2021 restructuring", "Block reference doesn't match known allocations"]
        }
      }
    }
  },

  GH: {
    name: "Ghana",
    documents: {
      BUSINESS_REG: {
        name: "Certificate of Incorporation / Business Registration",
        issuer: "Office of the Registrar of Companies (ORC) / Registrar General's Department",
        portal: "https://rgd.gov.gh",
        security_features: [
          "Ghana coat of arms",
          "Registration number",
          "Registrar General's signature",
          "Official stamp",
          "Digital certificate available via RGD portal"
        ],
        forgery_indicators: [
          "Coat of arms incorrect (wrong star or eagle details)",
          "Registration number not on RGD portal",
          "Old format claiming recent date"
        ],
        verify_online: "https://rgd.gov.gh — Company search"
      },
      TAX_CERT: {
        name: "GRA Tax Clearance Certificate",
        issuer: "Ghana Revenue Authority (GRA)",
        portal: "https://gra.gov.gh",
        security_features: [
          "GRA logo",
          "TIN format: CXXXXXXXXXX or PXXXXXXXXXX",
          "Commissioner General's signature",
          "Validity period"
        ],
        forgery_indicators: [
          "TIN prefix wrong (C for company, P for individual)",
          "GRA logo outdated",
          "No validity period stated"
        ],
        verify_online: "https://gra.gov.gh — TIN verification"
      },
      QUALITY_CERT: {
        name: "GSA Standards Certification",
        issuer: "Ghana Standards Authority (GSA)",
        security_features: ["GSA mark", "Certificate number", "Product test report reference"],
        forgery_indicators: ["GSA mark inconsistent", "No test report reference"]
      },
      INDUSTRY: {
        FDA: {
          name: "FDA Registration Certificate",
          issuer: "Food and Drugs Authority Ghana",
          security_features: ["FDA registration number", "Product category", "Validity dates", "FDA logo"],
          forgery_indicators: ["Registration number not verifiable", "Expired validity"]
        },
        MINERALS_COMMISSION: {
          name: "Mining License / Mineral Rights Certificate",
          issuer: "Minerals Commission of Ghana",
          security_features: ["License number", "Concession area reference", "Commission seal"],
          forgery_indicators: ["Concession area doesn't match known allocations", "Wrong commission seal"]
        }
      }
    }
  },

  SN: {
    name: "Senegal",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce et du Crédit Mobilier (RCCM)",
        issuer: "Tribunal de Commerce / APIX (Agence de Promotion des Investissements)",
        portal: "https://www.apix.sn",
        security_features: ["RCCM number", "Court stamp", "NINEA fiscal number", "French-language certificate"],
        forgery_indicators: ["RCCM format incorrect", "No NINEA reference", "Court stamp missing"]
      },
      TAX_CERT: {
        name: "Attestation de Régularité Fiscale",
        issuer: "Direction Générale des Impôts et des Domaines (DGID)",
        security_features: ["DGID letterhead", "NINEA number", "Validity period", "Director's signature"],
        forgery_indicators: ["NINEA format wrong", "No validity dates"]
      }
    }
  },

  CI: {
    name: "Côte d'Ivoire",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce (RCCM)",
        issuer: "Centre de Promotion des Investissements (CEPICI) / Tribunal de Commerce",
        security_features: ["RCCM number", "CEPICI stamp", "Compte Contribuable (CC) number"],
        forgery_indicators: ["No CC number", "CEPICI stamp missing"]
      },
      TAX_CERT: {
        name: "Attestation de Régularité Fiscale",
        issuer: "Direction Générale des Impôts (DGI)",
        security_features: ["DGI stamp", "CC number", "Validity period"],
        forgery_indicators: ["CC number doesn't match RCCM records"]
      }
    }
  },

  CM: {
    name: "Cameroon",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce (RC) / Business Registration Certificate",
        issuer: "Centre de Formalités de Création d'Entreprises (CFCE)",
        security_features: ["RC number", "Bilingual French/English", "NIU (fiscal ID)", "CFCE stamp"],
        forgery_indicators: ["Not bilingual", "No NIU reference", "CFCE stamp missing"]
      },
      TAX_CERT: {
        name: "Attestation de Non-Redevance",
        issuer: "Direction Générale des Impôts",
        security_features: ["NIU reference", "DGI stamp", "Validity period"],
        forgery_indicators: ["NIU mismatch", "No DGI stamp"]
      }
    }
  },

  ML: {
    name: "Mali",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce (RCCM)",
        issuer: "Centre de Formalités des Entreprises (CFE)",
        security_features: ["RCCM number", "NIF (fiscal ID)", "CFE stamp"],
        forgery_indicators: ["No NIF", "CFE stamp missing"]
      }
    }
  },

  BF: {
    name: "Burkina Faso",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce (RCCM)",
        issuer: "CEFORE / Tribunal de Commerce",
        security_features: ["RCCM number", "IFU number", "CEFORE stamp"],
        forgery_indicators: ["No IFU", "CEFORE stamp inconsistent"]
      }
    }
  },

  NE: {
    name: "Niger",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce (RCCM)",
        issuer: "Maison de l'Entreprise / Tribunal de Commerce",
        security_features: ["RCCM number", "NIF number", "Court stamp"],
        forgery_indicators: ["No NIF", "Court stamp missing"]
      }
    }
  },

  GN: {
    name: "Guinea",
    documents: {
      BUSINESS_REG: {
        name: "Registre du Commerce (RCCM)",
        issuer: "APIP (Agence de Promotion des Investissements Privés)",
        security_features: ["RCCM number", "NIF", "APIP stamp"],
        forgery_indicators: ["No NIF", "APIP stamp missing"]
      }
    }
  },

  SL: {
    name: "Sierra Leone",
    documents: {
      BUSINESS_REG: {
        name: "Certificate of Incorporation",
        issuer: "Corporate Affairs Commission (OARG)",
        security_features: ["Registration number", "OARG seal", "Registrar's signature"],
        forgery_indicators: ["No OARG seal", "Registration number format wrong"]
      }
    }
  },

  LR: {
    name: "Liberia",
    documents: {
      BUSINESS_REG: {
        name: "Articles of Incorporation",
        issuer: "Liberia Business Registry (LBR)",
        security_features: ["LBR seal", "Registration number", "Registrar's signature"],
        forgery_indicators: ["No LBR seal", "Registration format incorrect"]
      }
    }
  },

  GM: {
    name: "Gambia",
    documents: {
      BUSINESS_REG: {
        name: "Business Registration Certificate",
        issuer: "GIEPA / Registrar General",
        security_features: ["Registration number", "GIEPA stamp", "Government seal"],
        forgery_indicators: ["No GIEPA stamp", "Wrong government seal"]
      }
    }
  },

  CV: { name: "Cabo Verde", documents: { BUSINESS_REG: { name: "Certidão Comercial", issuer: "Conservatória do Registo Comercial", security_features: ["Registration number", "Official stamp", "Portuguese language"], forgery_indicators: ["Wrong language", "No stamp"] } } },
  GW: { name: "Guinea-Bissau", documents: { BUSINESS_REG: { name: "Certidão Comercial", issuer: "Conservatória do Registo Comercial", security_features: ["RCCM number", "NIF", "Court stamp"], forgery_indicators: ["No NIF", "No stamp"] } } },
  TG: { name: "Togo", documents: { BUSINESS_REG: { name: "Registre du Commerce (RCCM)", issuer: "CFE / Tribunal de Commerce", security_features: ["RCCM number", "NIF", "CFE stamp"], forgery_indicators: ["No NIF", "No stamp"] } } },
  BJ: { name: "Benin", documents: { BUSINESS_REG: { name: "Registre du Commerce (RCCM)", issuer: "GUFE / Tribunal de Commerce", security_features: ["RCCM number", "IFU number", "GUFE stamp"], forgery_indicators: ["No IFU", "No stamp"] } } },
  MR: { name: "Mauritania", documents: { BUSINESS_REG: { name: "Registre du Commerce", issuer: "Tribunal de Commerce", security_features: ["RC number", "NIF", "Arabic/French bilingual"], forgery_indicators: ["Not bilingual", "No NIF"] } } },

  // ─── SOUTHERN AFRICA ───
  ZA: {
    name: "South Africa",
    documents: {
      BUSINESS_REG: {
        name: "Company Registration Certificate / CK Document",
        issuer: "Companies and Intellectual Property Commission (CIPC)",
        portal: "https://www.cipc.co.za",
        security_features: [
          "CIPC registration number format: YYYY/XXXXXX/XX",
          "Company name and type clearly stated",
          "CIPC digital certificate (newer registrations)",
          "Registration date",
          "Barcode/QR code on digital certificates"
        ],
        forgery_indicators: [
          "Registration number format doesn't match (year/6 digits/2 digits)",
          "Not verifiable on CIPC e-services portal",
          "CK format used for post-2011 companies (CK was replaced)",
          "Missing CIPC barcode on digital certificates"
        ],
        verify_online: "https://eservices.cipc.co.za — Company search and verification"
      },
      TAX_CERT: {
        name: "SARS Tax Clearance Certificate / Tax Compliance Status (TCS) Pin",
        issuer: "South African Revenue Service (SARS)",
        portal: "https://www.sars.gov.za",
        security_features: [
          "TCS PIN (replaced paper certificates in 2019)",
          "Tax reference number format",
          "SARS eFiling verification",
          "Digital verification — no paper certificates issued since 2019"
        ],
        forgery_indicators: [
          "Paper certificate claiming post-2019 issue date",
          "TCS PIN doesn't verify on SARS eFiling",
          "Tax reference number format wrong"
        ],
        verify_online: "https://www.sarsefiling.co.za — TCS PIN verification"
      },
      GOV_ID: {
        name: "Smart ID Card / Green ID Book",
        issuer: "Department of Home Affairs",
        security_features: [
          "Smart ID: Polycarbonate card, chip, holographic overlay, 13-digit ID number",
          "Green book: Barcoded, laminated photo page",
          "ID number encodes DOB, gender, citizenship: YYMMDDXXXXCXX"
        ],
        forgery_indicators: [
          "ID number doesn't encode valid DOB",
          "Luhn check digit fails",
          "Smart ID chip doesn't scan",
          "Green book photo appears tampered"
        ]
      },
      QUALITY_CERT: {
        name: "SABS Mark / Letter of Authority",
        issuer: "South African Bureau of Standards (SABS) / NRCS",
        portal: "https://www.sabs.co.za",
        security_features: ["SABS mark", "LoA number from NRCS", "Product specification reference"],
        forgery_indicators: ["SABS mark inconsistent", "LoA number not verifiable"]
      },
      INDUSTRY: {
        BEE: {
          name: "B-BBEE Certificate / Affidavit",
          issuer: "Accredited SANAS verification agencies",
          security_features: ["SANAS accreditation number of verifier", "B-BBEE level", "Validity period", "Company registration cross-reference"],
          forgery_indicators: ["Verification agency not SANAS-accredited", "Level doesn't match company profile", "Expired validity"]
        }
      }
    }
  },

  ZW: {
    name: "Zimbabwe",
    documents: {
      BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Registrar of Companies (ZACC)", security_features: ["Registration number", "ZACC seal", "Registrar signature"], forgery_indicators: ["No ZACC seal", "Format inconsistent"] },
      TAX_CERT: { name: "ZIMRA Tax Clearance", issuer: "Zimbabwe Revenue Authority (ZIMRA)", security_features: ["ZIMRA letterhead", "BP number", "Validity period"], forgery_indicators: ["BP number format wrong", "No validity period"] }
    }
  },

  MZ: {
    name: "Mozambique",
    documents: {
      BUSINESS_REG: { name: "Certidão de Registo Comercial", issuer: "Conservatória do Registo de Entidades Legais", security_features: ["NUIT (fiscal ID)", "Registration number", "Portuguese language"], forgery_indicators: ["No NUIT", "Wrong language"] },
      TAX_CERT: { name: "Certidão de Quitação Fiscal", issuer: "Autoridade Tributária de Moçambique", security_features: ["NUIT reference", "AT stamp", "Validity"], forgery_indicators: ["NUIT mismatch", "No AT stamp"] }
    }
  },

  ZM: {
    name: "Zambia",
    documents: {
      BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Patents and Companies Registration Agency (PACRA)", portal: "https://www.pacra.org.zm", security_features: ["PACRA seal", "Company number", "Registrar signature", "QR code (newer)"], forgery_indicators: ["No PACRA seal", "Company number not on PACRA portal"], verify_online: "https://www.pacra.org.zm — Company search" },
      TAX_CERT: { name: "ZRA Tax Clearance", issuer: "Zambia Revenue Authority (ZRA)", security_features: ["TPIN number", "ZRA stamp", "Validity"], forgery_indicators: ["TPIN format wrong", "No ZRA stamp"] }
    }
  },

  MW: { name: "Malawi", documents: { BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Registrar General", security_features: ["Registration number", "Government seal"], forgery_indicators: ["No government seal"] } } },
  BW: {
    name: "Botswana",
    documents: {
      BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Companies and Intellectual Property Authority (CIPA)", portal: "https://www.cipa.co.bw", security_features: ["CIPA registration number", "Official seal", "QR code"], forgery_indicators: ["No CIPA seal", "Not on CIPA portal"], verify_online: "https://www.cipa.co.bw — Online search" },
      TAX_CERT: { name: "BURS Tax Clearance", issuer: "Botswana Unified Revenue Service (BURS)", security_features: ["TIN number", "BURS stamp"], forgery_indicators: ["TIN format wrong"] }
    }
  },

  NA: { name: "Namibia", documents: { BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "BIPA (Business and Intellectual Property Authority)", security_features: ["BIPA registration", "Seal", "Registration number"], forgery_indicators: ["No BIPA seal"] } } },
  SZ: { name: "Eswatini", documents: { BUSINESS_REG: { name: "Certificate of Registration", issuer: "Registrar of Companies", security_features: ["Registration number", "Coat of arms"], forgery_indicators: ["Wrong coat of arms"] } } },
  LS: { name: "Lesotho", documents: { BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Registrar of Companies / OBFC", security_features: ["Registration number", "OBFC stamp"], forgery_indicators: ["No OBFC stamp"] } } },
  AO: { name: "Angola", documents: { BUSINESS_REG: { name: "Certidão de Registo Comercial", issuer: "GUICHET Único da Empresa", security_features: ["NIF", "Registration number", "Portuguese"], forgery_indicators: ["No NIF"] } } },

  // ─── NORTH AFRICA ───
  EG: {
    name: "Egypt",
    documents: {
      BUSINESS_REG: {
        name: "Commercial Register Extract (السجل التجاري)",
        issuer: "General Authority for Investment and Free Zones (GAFI)",
        portal: "https://www.gafi.gov.eg",
        security_features: ["Arabic/English bilingual", "Commercial register number", "GAFI stamp", "Ministry of Trade seal"],
        forgery_indicators: ["Not bilingual", "No GAFI stamp", "Register number format wrong"]
      },
      TAX_CERT: {
        name: "Tax Card (البطاقة الضريبية)",
        issuer: "Egyptian Tax Authority (ETA)",
        security_features: ["Tax registration number", "ETA stamp", "Card number"],
        forgery_indicators: ["Tax number format incorrect", "No ETA stamp"]
      }
    }
  },

  MA: {
    name: "Morocco",
    documents: {
      BUSINESS_REG: { name: "Registre du Commerce (RC)", issuer: "Tribunal de Commerce / OMPIC", portal: "https://www.ompic.ma", security_features: ["RC number", "ICE number (corporate ID)", "OMPIC stamp"], forgery_indicators: ["No ICE number", "RC format wrong"], verify_online: "https://www.directinfo.ma — Company verification" },
      TAX_CERT: { name: "Attestation de Régularité Fiscale", issuer: "Direction Générale des Impôts (DGI)", security_features: ["IF (fiscal ID)", "DGI stamp", "Validity period"], forgery_indicators: ["IF format wrong", "No DGI stamp"] }
    }
  },

  TN: { name: "Tunisia", documents: { BUSINESS_REG: { name: "Registre du Commerce", issuer: "Registre National des Entreprises (RNE)", portal: "https://www.registre-entreprises.tn", security_features: ["MF (fiscal ID)", "RNE registration", "Court stamp"], forgery_indicators: ["No MF number"], verify_online: "https://www.registre-entreprises.tn" } } },
  DZ: { name: "Algeria", documents: { BUSINESS_REG: { name: "Registre du Commerce (RC)", issuer: "Centre National du Registre de Commerce (CNRC)", security_features: ["RC number", "NIF", "CNRC stamp", "Arabic/French bilingual"], forgery_indicators: ["Not bilingual", "No NIF", "No CNRC stamp"] } } },
  LY: { name: "Libya", documents: { BUSINESS_REG: { name: "Commercial Register", issuer: "Ministry of Economy and Trade", security_features: ["Arabic text", "Ministry stamp"], forgery_indicators: ["No ministry stamp"] } } },
  SD: { name: "Sudan", documents: { BUSINESS_REG: { name: "Business Registration Certificate", issuer: "Registrar General of Companies", security_features: ["Arabic/English", "Registration number", "Government stamp"], forgery_indicators: ["Not bilingual", "No government stamp"] } } },

  // ─── CENTRAL AFRICA ───
  CD: {
    name: "Democratic Republic of Congo",
    documents: {
      BUSINESS_REG: { name: "Registre du Commerce (RCCM)", issuer: "Guichet Unique de Création d'Entreprise (GUCE)", security_features: ["RCCM number", "NIF/Id. Nat.", "GUCE stamp"], forgery_indicators: ["No NIF", "No GUCE stamp"] },
      INDUSTRY: { MINING: { name: "Mining Permit / Carte d'Exploitant Artisanal", issuer: "Cadastre Minier (CAMI)", security_features: ["CAMI permit number", "GPS coordinates of concession", "Ministry seal"], forgery_indicators: ["Concession coordinates don't match CAMI records", "No CAMI number"] } }
    }
  },

  CG: { name: "Republic of Congo", documents: { BUSINESS_REG: { name: "Registre du Commerce (RCCM)", issuer: "CFCE", security_features: ["RCCM number", "NIF", "CFCE stamp"], forgery_indicators: ["No NIF"] } } },
  GA: { name: "Gabon", documents: { BUSINESS_REG: { name: "Registre du Commerce (RCCM)", issuer: "ANPI-Gabon / Tribunal de Commerce", security_features: ["RCCM number", "NIF", "ANPI stamp"], forgery_indicators: ["No NIF", "No ANPI stamp"] } } },
  TD: { name: "Chad", documents: { BUSINESS_REG: { name: "Registre du Commerce (RCCM)", issuer: "Tribunal de Commerce / ANIE", security_features: ["RCCM number", "NIF", "Arabic/French bilingual"], forgery_indicators: ["Not bilingual", "No NIF"] } } },
  CF: { name: "Central African Republic", documents: { BUSINESS_REG: { name: "Registre du Commerce", issuer: "GUFE / Tribunal de Commerce", security_features: ["RC number", "NIF", "Court stamp"], forgery_indicators: ["No NIF"] } } },
  GQ: { name: "Equatorial Guinea", documents: { BUSINESS_REG: { name: "Registro Mercantil", issuer: "Ministerio de Hacienda y Presupuestos", security_features: ["NIF", "Spanish language", "Ministry stamp"], forgery_indicators: ["No NIF", "Wrong language"] } } },
  ST: { name: "São Tomé and Príncipe", documents: { BUSINESS_REG: { name: "Certidão Comercial", issuer: "Conservatória do Registo Comercial", security_features: ["Registration number", "Portuguese", "Official stamp"], forgery_indicators: ["No stamp"] } } },
  BI: { name: "Burundi", documents: { BUSINESS_REG: { name: "Registre du Commerce (RC)", issuer: "Tribunal de Commerce / API (Agence de Promotion des Investissements)", security_features: ["RC number", "NIF", "API stamp"], forgery_indicators: ["No NIF", "No API stamp"] } } },

  // ─── ISLAND NATIONS ───
  MU: {
    name: "Mauritius",
    documents: {
      BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Companies Division, Ministry of Finance", portal: "https://companies.govmu.org", security_features: ["BRN (Business Registration Number)", "File number", "Government stamp"], forgery_indicators: ["BRN not on portal"], verify_online: "https://companies.govmu.org — Company search" },
      TAX_CERT: { name: "MRA Tax Clearance", issuer: "Mauritius Revenue Authority (MRA)", security_features: ["TAN number", "MRA stamp", "Validity"], forgery_indicators: ["TAN format wrong"] }
    }
  },

  MG: { name: "Madagascar", documents: { BUSINESS_REG: { name: "Registre du Commerce", issuer: "EDBM / Tribunal de Commerce", security_features: ["RCS number", "NIF/STAT", "EDBM stamp"], forgery_indicators: ["No NIF/STAT", "No EDBM stamp"] } } },
  SC: { name: "Seychelles", documents: { BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Registrar of Companies / Financial Services Authority", security_features: ["Registration number", "FSA seal"], forgery_indicators: ["No FSA seal"] } } },
  KM: { name: "Comoros", documents: { BUSINESS_REG: { name: "Registre du Commerce", issuer: "Tribunal de Commerce", security_features: ["RC number", "NIF", "Court stamp"], forgery_indicators: ["No NIF"] } } },
};

// ═══════════════════════════════════════════════════════════
// GLOBAL TRADE PARTNERS — 30 MAJOR ECONOMIES
// ═══════════════════════════════════════════════════════════

const GLOBAL: Record<string, any> = {
  US: {
    name: "United States",
    documents: {
      BUSINESS_REG: { name: "Certificate of Incorporation / LLC Articles of Organization", issuer: "Secretary of State (varies by state)", security_features: ["State seal", "Filing number", "State-specific format", "Certified copies have raised seal"], forgery_indicators: ["Filing number not on state SoS website", "State seal missing", "Format inconsistent with state norms"], verify_online: "Each state has its own portal — e.g., Delaware: https://icis.corp.delaware.gov" },
      TAX_CERT: { name: "IRS EIN Confirmation Letter (CP 575)", issuer: "Internal Revenue Service (IRS)", security_features: ["EIN format: XX-XXXXXXX", "IRS letterhead", "CP 575 notice format"], forgery_indicators: ["EIN doesn't verify on IRS", "Wrong letter format", "IRS logo incorrect"] },
      GOV_ID: { name: "US Passport / State Driver's License", issuer: "US Department of State / State DMV", security_features: ["Passport: ICAO MRZ, RFID chip, laser-engraved photo, UV features", "DL: State-specific security features, barcodes, holograms"], forgery_indicators: ["MRZ checksum fails", "UV features absent", "Barcode data doesn't match printed info"] }
    }
  },

  GB: {
    name: "United Kingdom",
    documents: {
      BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Companies House", portal: "https://www.gov.uk/get-information-about-a-company", security_features: ["Company number format", "Companies House digital certificate", "Incorporation date"], forgery_indicators: ["Company number not on Companies House"], verify_online: "https://find-and-update.company-information.service.gov.uk" },
      TAX_CERT: { name: "HMRC Tax Documents / UTR", issuer: "HM Revenue & Customs", security_features: ["UTR format: 10 digits", "HMRC letterhead"], forgery_indicators: ["UTR doesn't verify", "Wrong HMRC branding"] }
    }
  },

  CN: {
    name: "China",
    documents: {
      BUSINESS_REG: { name: "Business License (营业执照)", issuer: "State Administration for Market Regulation (SAMR)", security_features: ["Unified Social Credit Code (18 chars)", "Red SAMR seal", "QR code", "Chinese text with regulated format"], forgery_indicators: ["USCC doesn't verify on National Enterprise Credit Information", "QR code doesn't scan", "Wrong seal format"], verify_online: "https://www.gsxt.gov.cn — National Enterprise Credit Information" },
      QUALITY_CERT: { name: "CCC Mark (China Compulsory Certification)", issuer: "CNCA (Certification and Accreditation Administration)", security_features: ["CCC mark with certificate number", "CNCA-authorized body", "Product model matches"], forgery_indicators: ["CCC number not verifiable", "Wrong certification body"] }
    }
  },

  IN: {
    name: "India",
    documents: {
      BUSINESS_REG: { name: "Certificate of Incorporation (CIN)", issuer: "Ministry of Corporate Affairs (MCA)", portal: "https://www.mca.gov.in", security_features: ["CIN: 21-character alphanumeric", "Digital signature of RoC", "MCA watermark"], forgery_indicators: ["CIN format wrong", "Not on MCA portal"], verify_online: "https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do" },
      TAX_CERT: { name: "GST Registration Certificate / PAN Card", issuer: "GSTN / Income Tax Department", security_features: ["GSTIN: 15 characters", "PAN: 10 characters (AAAAA0000A format)", "QR code on GST certificate"], forgery_indicators: ["GSTIN/PAN format wrong", "Not verifiable on GST portal"], verify_online: "https://www.gst.gov.in — GSTIN verification" }
    }
  },

  AE: {
    name: "United Arab Emirates",
    documents: {
      BUSINESS_REG: { name: "Trade License", issuer: "Department of Economic Development (DED) / Free Zone Authority", security_features: ["License number", "DED or FZ authority stamp", "QR code", "Arabic/English bilingual"], forgery_indicators: ["Not bilingual", "License number not verifiable", "Wrong authority for stated free zone"] },
      TAX_CERT: { name: "TRN Certificate", issuer: "Federal Tax Authority (FTA)", security_features: ["TRN format: 15 digits", "FTA letterhead"], forgery_indicators: ["TRN format wrong", "Not on FTA portal"] }
    }
  },

  DE: {
    name: "Germany",
    documents: {
      BUSINESS_REG: { name: "Handelsregisterauszug (Commercial Register Extract)", issuer: "Amtsgericht (Local Court)", portal: "https://www.handelsregister.de", security_features: ["HRB/HRA number", "Court stamp", "German language"], forgery_indicators: ["HRB number not on Handelsregister"], verify_online: "https://www.handelsregister.de" },
      TAX_CERT: { name: "Steuernummer / USt-IdNr", issuer: "Finanzamt / BZSt", security_features: ["USt-IdNr format: DE + 9 digits", "Finanzamt stamp"], forgery_indicators: ["USt-IdNr format wrong"], verify_online: "https://evatr.bff-online.de/eVatR/ — EU VAT verification" }
    }
  },

  FR: { name: "France", documents: { BUSINESS_REG: { name: "Extrait Kbis", issuer: "Greffe du Tribunal de Commerce", portal: "https://www.infogreffe.fr", security_features: ["SIREN/SIRET number (9/14 digits)", "Greffe stamp", "QR code"], forgery_indicators: ["SIREN format wrong", "Not on Infogreffe"], verify_online: "https://www.infogreffe.fr" } } },
  NL: { name: "Netherlands", documents: { BUSINESS_REG: { name: "KVK Extract (Uittreksel)", issuer: "Kamer van Koophandel (KVK)", portal: "https://www.kvk.nl", security_features: ["KVK number: 8 digits", "Digital certificate"], forgery_indicators: ["KVK number not on kvk.nl"], verify_online: "https://www.kvk.nl" } } },
  IT: { name: "Italy", documents: { BUSINESS_REG: { name: "Visura Camerale", issuer: "Camera di Commercio / InfoCamere", security_features: ["Codice Fiscale / Partita IVA", "Chamber stamp", "Digital signature"], forgery_indicators: ["P.IVA format wrong (11 digits)"] } } },
  ES: { name: "Spain", documents: { BUSINESS_REG: { name: "Certificación del Registro Mercantil", issuer: "Registro Mercantil", security_features: ["CIF/NIF number", "Registrar stamp", "Registration data"], forgery_indicators: ["CIF format wrong"] } } },

  TR: { name: "Turkey", documents: { BUSINESS_REG: { name: "Ticaret Sicili Gazetesi (Trade Registry Gazette)", issuer: "TOBB / Trade Registry Office", portal: "https://www.ticaretsicil.gov.tr", security_features: ["Gazette issue number", "VKN (tax number)", "Chamber stamp"], forgery_indicators: ["Gazette not on TOBB portal", "VKN format wrong"], verify_online: "https://www.ticaretsicil.gov.tr" } } },

  JP: { name: "Japan", documents: { BUSINESS_REG: { name: "登記事項証明書 (Certificate of Registered Matters)", issuer: "Legal Affairs Bureau (法務局)", security_features: ["Company number (法人番号): 13 digits", "Bureau stamp", "Japanese text"], forgery_indicators: ["Company number format wrong", "No bureau stamp"], verify_online: "https://www.houjin-bangou.nta.go.jp — Corporate Number search" } } },
  KR: { name: "South Korea", documents: { BUSINESS_REG: { name: "사업자등록증 (Business Registration Certificate)", issuer: "National Tax Service (NTS)", security_features: ["Business number: XXX-XX-XXXXX", "NTS stamp", "Korean text"], forgery_indicators: ["Number format wrong", "No NTS stamp"] } } },

  BR: { name: "Brazil", documents: { BUSINESS_REG: { name: "Contrato Social / CNPJ Card", issuer: "Junta Comercial / Receita Federal", portal: "https://servicos.receita.fazenda.gov.br", security_features: ["CNPJ: 14 digits (XX.XXX.XXX/XXXX-XX)", "Junta seal"], forgery_indicators: ["CNPJ format wrong", "Not on Receita Federal"], verify_online: "https://servicos.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp" } } },
  MX: { name: "Mexico", documents: { BUSINESS_REG: { name: "Acta Constitutiva / RFC", issuer: "SAT (Servicio de Administración Tributaria)", security_features: ["RFC format: 12-13 chars", "SAT stamp", "Notary seal"], forgery_indicators: ["RFC format wrong", "No notary seal"] } } },

  AU: { name: "Australia", documents: { BUSINESS_REG: { name: "ASIC Company Extract", issuer: "Australian Securities & Investments Commission (ASIC)", portal: "https://connectonline.asic.gov.au", security_features: ["ACN: 9 digits", "ABN: 11 digits", "ASIC digital extract"], forgery_indicators: ["ACN/ABN format wrong", "Not on ASIC portal"], verify_online: "https://connectonline.asic.gov.au" } } },
  NZ: { name: "New Zealand", documents: { BUSINESS_REG: { name: "Companies Office Registration", issuer: "NZ Companies Office", portal: "https://www.companiesoffice.govt.nz", security_features: ["NZBN: 13 digits", "Company number"], forgery_indicators: ["Not on Companies Office register"], verify_online: "https://www.companiesoffice.govt.nz/companies/app/ui/pages/companies/search" } } },

  SG: { name: "Singapore", documents: { BUSINESS_REG: { name: "ACRA BizFile+ Extract", issuer: "Accounting and Corporate Regulatory Authority (ACRA)", portal: "https://www.acra.gov.sg", security_features: ["UEN format: 9/10 digits + letter", "ACRA digital certificate"], forgery_indicators: ["UEN format wrong", "Not on BizFile+"], verify_online: "https://www.acra.gov.sg/bizfile" } } },
  HK: { name: "Hong Kong", documents: { BUSINESS_REG: { name: "Certificate of Incorporation / Business Registration Certificate", issuer: "Companies Registry / IRD", portal: "https://www.cr.gov.hk", security_features: ["CR number", "BR number", "Government stamp"], forgery_indicators: ["CR number not on ICRIS"], verify_online: "https://www.icris.cr.gov.hk" } } },

  SA: { name: "Saudi Arabia", documents: { BUSINESS_REG: { name: "Commercial Registration (السجل التجاري)", issuer: "Ministry of Commerce", portal: "https://mc.gov.sa", security_features: ["CR number: 10 digits", "Arabic text", "Ministry seal", "QR code"], forgery_indicators: ["CR number not verifiable", "No QR code on newer certificates"], verify_online: "https://mc.gov.sa — Commercial registration verification" } } },
  QA: { name: "Qatar", documents: { BUSINESS_REG: { name: "Commercial Registration", issuer: "Ministry of Commerce and Industry", security_features: ["CR number", "Arabic/English bilingual", "Ministry stamp"], forgery_indicators: ["Not bilingual", "No ministry stamp"] } } },

  CA: { name: "Canada", documents: { BUSINESS_REG: { name: "Certificate of Incorporation / Business Number", issuer: "Corporations Canada / Provincial Registries", portal: "https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html", security_features: ["Corporation number", "BN format: 9 digits + RT0001", "Government seal"], forgery_indicators: ["Corp number not on federal search", "BN format wrong"], verify_online: "https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html" } } },

  IL: { name: "Israel", documents: { BUSINESS_REG: { name: "Certificate of Incorporation", issuer: "Registrar of Companies", portal: "https://ica.justice.gov.il", security_features: ["Company number: 9 digits", "Hebrew text", "Registrar stamp"], forgery_indicators: ["Number format wrong", "Not on ICA portal"] } } },

  RU: { name: "Russia", documents: { BUSINESS_REG: { name: "ОГРН Certificate (OGRN)", issuer: "Federal Tax Service (FNS)", security_features: ["OGRN: 13 digits", "INN: 10/12 digits", "FNS stamp"], forgery_indicators: ["OGRN format wrong", "INN checksum fails"], verify_online: "https://egrul.nalog.ru — Unified State Register" } } },

  PL: { name: "Poland", documents: { BUSINESS_REG: { name: "KRS Extract / CEIDG", issuer: "National Court Register / CEIDG", portal: "https://ekrs.ms.gov.pl", security_features: ["KRS number: 10 digits", "NIP: 10 digits", "REGON: 9/14 digits"], forgery_indicators: ["KRS number not on eKRS"], verify_online: "https://ekrs.ms.gov.pl" } } },
  SE: { name: "Sweden", documents: { BUSINESS_REG: { name: "Bolagsverket Registration", issuer: "Swedish Companies Registration Office (Bolagsverket)", security_features: ["Org number: XXXXXX-XXXX", "Bolagsverket stamp"], forgery_indicators: ["Org number format wrong"], verify_online: "https://www.bolagsverket.se" } } },
  CH: { name: "Switzerland", documents: { BUSINESS_REG: { name: "Handelsregisterauszug", issuer: "Cantonal Commercial Registry", portal: "https://www.zefix.ch", security_features: ["CHE number (UID): CHE-XXX.XXX.XXX", "Canton registry stamp"], forgery_indicators: ["CHE number not on Zefix"], verify_online: "https://www.zefix.ch" } } },
};

// ═══════════════════════════════════════════════════════════
// CROSS-BORDER / INTERNATIONAL DOCUMENTS
// ═══════════════════════════════════════════════════════════

const INTERNATIONAL_DOCUMENTS: Record<string, any> = {
  BILL_OF_LADING: {
    name: "Bill of Lading (B/L)",
    issuers: "Shipping lines (Maersk, MSC, CMA CGM, etc.)",
    security_features: [
      "Carrier's official letterhead and logo",
      "Unique B/L number format (carrier-specific prefix)",
      "Shipper, consignee, and notify party details",
      "Container number format: 4 letters + 7 digits (ISO 6346)",
      "Port codes (UN/LOCODE format)",
      "Carrier's authorized signature or digital stamp",
      "Original vs copy watermark distinction"
    ],
    forgery_indicators: [
      "Container number doesn't follow ISO 6346 (check digit fails)",
      "Port codes don't exist in UN/LOCODE database",
      "B/L number format inconsistent with carrier's known format",
      "Carrier logo outdated or wrong version",
      "Freight terms inconsistent (CIF vs FOB mismatch with LC terms)",
      "'Original' stamp on what appears to be a photocopy"
    ]
  },
  AIRWAY_BILL: {
    name: "Air Waybill (AWB)",
    issuers: "Airlines / IATA member carriers",
    security_features: [
      "11-digit AWB number (3-digit airline prefix + 8-digit serial)",
      "IATA format with 12 copies (original 1-3)",
      "Airline logo and IATA code",
      "Weight/dimension calculations"
    ],
    forgery_indicators: [
      "Airline prefix doesn't match known IATA codes",
      "AWB number check digit fails",
      "Weight calculations don't add up"
    ]
  },
  LETTER_OF_CREDIT: {
    name: "Letter of Credit (L/C)",
    issuers: "Issuing banks (SWIFT member institutions)",
    security_features: [
      "SWIFT MT700 format for documentary credits",
      "Issuing bank's SWIFT/BIC code (8 or 11 characters)",
      "Advising bank details",
      "L/C reference number",
      "UCP 600 or ISP98 reference",
      "Bank stamps and authorized signatures"
    ],
    forgery_indicators: [
      "SWIFT/BIC code doesn't verify on SWIFT directory",
      "Bank name doesn't match known SWIFT members",
      "No UCP 600 reference on documentary credits",
      "Amendments not properly referenced",
      "Beneficiary details inconsistent with other documents"
    ]
  },
  CERTIFICATE_OF_ORIGIN: {
    name: "Certificate of Origin (Generic / WTO)",
    issuers: "National chambers of commerce / authorized bodies",
    security_features: [
      "Issuing chamber's stamp and signature",
      "HS (Harmonized System) codes for products",
      "Country of origin declaration",
      "Serial/reference number",
      "For preferential CoO: specific trade agreement form (EUR.1, Form A, AfCFTA CoO)"
    ],
    forgery_indicators: [
      "HS codes don't match product description",
      "Chamber stamp not from recognized issuing body",
      "No reference number",
      "Rules of origin criteria not properly declared for preferential tariffs"
    ]
  },
  PHYTOSANITARY_CERT: {
    name: "Phytosanitary Certificate",
    issuers: "National Plant Protection Organizations (NPPOs) per IPPC",
    security_features: [
      "IPPC standard format",
      "NPPO official stamp",
      "Inspector's signature",
      "Treatment declarations",
      "ISPM 15 mark on wood packaging"
    ],
    forgery_indicators: [
      "Not in IPPC standard format",
      "NPPO stamp inconsistent with country's known stamp",
      "Missing treatment details for regulated articles"
    ]
  },
  SGS_INSPECTION: {
    name: "Pre-Shipment Inspection Certificate",
    issuers: "SGS, Bureau Veritas, Intertek, Cotecna, etc.",
    security_features: [
      "Inspector company logo and letterhead",
      "Unique certificate number",
      "Inspector's name and signature",
      "Product specifications and quantity verification",
      "QR or barcode for verification"
    ],
    forgery_indicators: [
      "Certificate number not verifiable with inspection company",
      "Inspector name not on company roster",
      "Logo outdated",
      "Quantities don't match other trade documents"
    ]
  }
};

// ═══════════════════════════════════════════════════════════
// INDUSTRY-SPECIFIC DOCUMENTS
// ═══════════════════════════════════════════════════════════

const INDUSTRY_DOCUMENTS: Record<string, any> = {
  PHARMA: {
    name: "Pharmaceutical / Healthcare",
    documents: [
      { name: "Good Manufacturing Practice (GMP) Certificate", issuers: "National drug regulatory authorities (NAFDAC, EMA, FDA, SAHPRA, PPB)", security_features: ["Regulatory authority stamp", "GMP certificate number", "Facility inspection date", "Product scope"], forgery_indicators: ["Certificate number not verifiable", "Inspection date unrealistically old", "Facility address doesn't match known registered sites"] },
      { name: "WHO Prequalification Certificate", issuers: "World Health Organization", security_features: ["WHO PQ reference number", "Product and manufacturer match", "WHO letterhead"], forgery_indicators: ["PQ number not on WHO list (https://extranet.who.int/pqweb/)", "Product/manufacturer mismatch"] },
      { name: "Certificate of Pharmaceutical Product (CPP)", issuers: "National regulatory authority per WHO scheme", security_features: ["WHO CPP format", "Regulatory authority stamp", "Product registration number"], forgery_indicators: ["Not in WHO CPP format", "Registration number doesn't match national database"] },
      { name: "Cold Chain Compliance Certificate", issuers: "Logistics providers / inspection bodies", security_features: ["Temperature data logger records", "Chain of custody documentation", "Calibrated instrument certificates"], forgery_indicators: ["Temperature gaps in data logger", "Calibration certificates expired"] }
    ]
  },
  MINING: {
    name: "Mining & Minerals",
    documents: [
      { name: "Assay Certificate", issuers: "Certified assay offices (SGS, ALS, Intertek)", security_features: ["Laboratory accreditation number", "Sample ID chain", "Certified assayer signature", "ISO 17025 accreditation reference"], forgery_indicators: ["Lab not ISO 17025 accredited", "Sample IDs inconsistent", "Results suspiciously uniform across batches"] },
      { name: "Kimberley Process Certificate (Diamonds)", issuers: "National KP authority", security_features: ["KP certificate number", "Country-specific format", "Tamper-proof seal", "Unique serial"], forgery_indicators: ["Certificate number not in KPCS database", "Seal broken or missing", "Origin country known to be non-participant"] },
      { name: "EITI Compliance Report", issuers: "EITI Secretariat / National EITI body", security_features: ["EITI reference", "Revenue figures", "Company-government reconciliation"], forgery_indicators: ["Figures inconsistent with published EITI reports"] }
    ]
  },
  OIL_GAS: {
    name: "Oil & Gas / Energy",
    documents: [
      { name: "API Certification", issuers: "American Petroleum Institute", security_features: ["API monogram license number", "Product spec reference (API 5L, 5CT, etc.)", "API logo"], forgery_indicators: ["License number not on API composite list", "Wrong spec reference for product type"] },
      { name: "Certificate of Quality/Quantity (CQ)", issuers: "Independent inspection companies (SGS, Intertek, Saybolt)", security_features: ["Inspector signature", "Tank/vessel gauging records", "Lab analysis report", "Unique CQ number"], forgery_indicators: ["CQ number not verifiable", "Gauging records inconsistent with Bill of Lading quantities"] },
      { name: "NNPC Allocation Letter (Nigeria)", issuers: "Nigerian National Petroleum Corporation", security_features: ["NNPC letterhead", "Allocation reference number", "GMD/CEO signature"], forgery_indicators: ["Reference number not in known allocation series", "Signatory name wrong for period"] }
    ]
  },
  AGRICULTURE: {
    name: "Agriculture & Food",
    documents: [
      { name: "Phytosanitary Certificate", issuers: "National Plant Protection Organization (NPPO)", security_features: ["IPPC format", "NPPO stamp", "Treatment declarations"], forgery_indicators: ["Not IPPC format", "Wrong NPPO stamp"] },
      { name: "HACCP Certification", issuers: "Accredited certification bodies", security_features: ["Accreditation body logo", "Certificate number", "Scope of certification", "Validity period"], forgery_indicators: ["Accreditation body not recognized", "Expired", "Scope doesn't cover product"] },
      { name: "Organic Certification", issuers: "USDA, EU Organic, various national organic certifiers", security_features: ["Certifier accreditation", "Certificate number", "Operation ID", "Product scope"], forgery_indicators: ["Certifier not on accredited list", "Operation ID not verifiable"] },
      { name: "Fair Trade Certificate", issuers: "Fairtrade International / Fair Trade USA", security_features: ["FLO-ID number", "Product scope", "Validity period"], forgery_indicators: ["FLO-ID not on Fairtrade database"] }
    ]
  },
  TEXTILES: {
    name: "Textiles & Apparel",
    documents: [
      { name: "AGOA Certificate of Origin", issuers: "Designated authorities in AGOA-eligible countries", security_features: ["AGOA-specific form", "Country eligibility verified", "HS codes for textiles", "Visa stamp"], forgery_indicators: ["Country not AGOA-eligible for textile category", "HS codes don't match apparel type", "Missing textile visa"] },
      { name: "OEKO-TEX Certificate", issuers: "OEKO-TEX member institutes", security_features: ["Certificate number", "OEKO-TEX label class", "Test institute name"], forgery_indicators: ["Certificate not on OEKO-TEX database", "Test institute not an OEKO-TEX member"] }
    ]
  },
  CONSTRUCTION: {
    name: "Construction & Infrastructure",
    documents: [
      { name: "FIDIC Contract Certificate", issuers: "FIDIC-certified engineers", security_features: ["FIDIC contract form reference", "Engineer's certification", "Payment certificate number"], forgery_indicators: ["Wrong FIDIC form for contract type", "Engineer not registered"] },
      { name: "Performance Bond / Bank Guarantee", issuers: "Commercial banks / surety companies", security_features: ["Bank letterhead", "SWIFT verification", "Bond reference number", "Authorized signatory"], forgery_indicators: ["Bank not a SWIFT member", "Bond amount inconsistent with contract"] }
    ]
  }
};

// ═══════════════════════════════════════════════════════════
// UNIVERSAL FRAUD DETECTION CHECKLIST
// ═══════════════════════════════════════════════════════════

const FRAUD_CHECKLIST = {
  visual_inspection: [
    "Check for consistent font usage throughout the document",
    "Verify alignment and spacing are uniform (forgers often have margin issues)",
    "Look for pixelation around logos, stamps, or signatures (indicates digital manipulation)",
    "Check if the document resolution is consistent (pasted elements often differ)",
    "Verify date formats match the country's standard (DD/MM/YYYY vs MM/DD/YYYY)",
    "Check for spelling errors in official titles and authority names",
    "Verify the paper quality description matches government-issued standards",
    "Look for color consistency in stamps and seals",
    "Check if signatures appear stamped vs genuinely handwritten"
  ],
  metadata_checks: [
    "Cross-reference registration numbers with the issuing authority's public portal",
    "Verify the document's stated issuing authority existed at the claimed date",
    "Check if the authority name/branding matches the period (agencies get renamed)",
    "Verify tax ID/registration number format matches the country's known format",
    "Cross-reference officer/signatory names with known office holders for the period",
    "Check if referenced laws or regulations were in effect at the stated date"
  ],
  cross_document_consistency: [
    "Company name must be identical across all documents (exact spelling, punctuation)",
    "Registration numbers must match between certificate and tax documents",
    "Dates must be logically consistent (tax cert can't predate incorporation)",
    "Address must be consistent or changes properly documented",
    "Director/officer names must match across corporate documents",
    "Industry classification codes must be consistent"
  ],
  red_flags: [
    "Document claims to be from an authority that was renamed or restructured",
    "Validity dates extend beyond normal government-issued periods",
    "Multiple documents with identical serial numbers",
    "Documents from countries with known weak verification infrastructure lacking extra authentication",
    "Certification body not accredited by the relevant national accreditation body",
    "Unusually perfect or crisp quality for older documents",
    "Missing mandatory fields that genuine documents always contain",
    "QR codes that link to non-official domains"
  ]
};

// ═══════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, country_code, document_type, industry } = await req.json();

    let result: any;

    switch (action) {
      case "get_country": {
        const upper = (country_code || "").toUpperCase();
        result = AFRICA[upper] || GLOBAL[upper] || null;
        if (!result) result = { error: `Country code '${upper}' not found. Available: ${[...Object.keys(AFRICA), ...Object.keys(GLOBAL)].join(", ")}` };
        break;
      }

      case "get_document": {
        const upper = (country_code || "").toUpperCase();
        const countryData = AFRICA[upper] || GLOBAL[upper];
        if (!countryData) { result = { error: `Country '${upper}' not found` }; break; }
        const docType = (document_type || "").toUpperCase();
        result = countryData.documents?.[docType] || { error: `Document type '${docType}' not found for ${countryData.name}. Available: ${Object.keys(countryData.documents || {}).join(", ")}` };
        break;
      }

      case "get_international": {
        const docKey = (document_type || "").toUpperCase();
        result = INTERNATIONAL_DOCUMENTS[docKey] || { error: `International document '${docKey}' not found. Available: ${Object.keys(INTERNATIONAL_DOCUMENTS).join(", ")}` };
        break;
      }

      case "get_industry": {
        const indKey = (industry || "").toUpperCase();
        result = INDUSTRY_DOCUMENTS[indKey] || { error: `Industry '${indKey}' not found. Available: ${Object.keys(INDUSTRY_DOCUMENTS).join(", ")}` };
        break;
      }

      case "get_fraud_checklist": {
        result = FRAUD_CHECKLIST;
        break;
      }

      case "list_countries": {
        result = {
          africa: Object.entries(AFRICA).map(([code, data]: [string, any]) => ({ code, name: data.name })),
          global: Object.entries(GLOBAL).map(([code, data]: [string, any]) => ({ code, name: data.name })),
        };
        break;
      }

      case "full_library": {
        result = {
          total_countries: Object.keys(AFRICA).length + Object.keys(GLOBAL).length,
          africa_count: Object.keys(AFRICA).length,
          global_count: Object.keys(GLOBAL).length,
          industries_covered: Object.keys(INDUSTRY_DOCUMENTS),
          international_documents: Object.keys(INTERNATIONAL_DOCUMENTS),
          fraud_checklist_categories: Object.keys(FRAUD_CHECKLIST),
        };
        break;
      }

      default:
        result = {
          error: "Unknown action. Available: get_country, get_document, get_international, get_industry, get_fraud_checklist, list_countries, full_library",
        };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("document-verify-reference error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
