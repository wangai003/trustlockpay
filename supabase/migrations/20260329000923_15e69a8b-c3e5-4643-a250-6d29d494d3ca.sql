
INSERT INTO public.industry_templates (industry_key, display_name, description, default_milestones, document_gates, compliance_requirements, required_observer_roles, estimated_duration_days, rfq_enabled, invoice_schema, tax_rules) VALUES

-- 1. Energy / Oil & Gas
('energy', 'Energy / Oil & Gas', 'Upstream, midstream, and downstream oil & gas services including equipment procurement, drilling, and petrochemical exports.',
'[
  {"name":"Contract & LC / PO Upload","percentage":5,"documents":["Service Contract","Purchase Order","LC (if applicable)"],"documentMode":"required","description":"Trade agreement and financial instrument uploaded and co-signed","requiresObserver":false},
  {"name":"Equipment Inspection at Origin","percentage":10,"documents":["Equipment Inspection Report","Manufacturer Certificate","API Compliance Certificate"],"documentMode":"required","description":"Third-party inspection of equipment or materials before dispatch","requiresObserver":true},
  {"name":"Export License & NNPC/Regulatory Clearance","percentage":10,"documents":["Export License","NNPC Approval","Environmental Impact Assessment"],"documentMode":"required","description":"Government and regulatory body clearance for export","requiresObserver":true},
  {"name":"Shipping & Freight Documentation","percentage":20,"documents":["Bill of Lading","Marine Insurance Certificate","Dangerous Goods Declaration"],"documentMode":"required","description":"Goods dispatched with full freight documentation","requiresObserver":true},
  {"name":"Import Customs & Duty Settlement","percentage":15,"documents":["Import Declaration","Duty Receipt","Pre-Arrival Assessment Report"],"documentMode":"required","description":"Destination country customs processing and duty payment","requiresObserver":true},
  {"name":"Installation & Commissioning","percentage":25,"documents":["Installation Report","Commissioning Certificate","Safety Compliance Report"],"documentMode":"required","description":"Equipment installed, tested, and commissioned on-site","requiresObserver":true},
  {"name":"Final Acceptance & Payout","percentage":15,"documents":["Acceptance Certificate","Performance Test Report","Warranty Documentation"],"documentMode":"required","description":"Client acceptance testing passed, escrow funds released","requiresObserver":true}
]'::jsonb,
'[{"gate":"API Compliance Certificate","stage":"Equipment Inspection"},{"gate":"NNPC Approval","stage":"Export License"},{"gate":"Commissioning Certificate","stage":"Installation"}]'::jsonb,
ARRAY['API 6A/6D','ISO 14001','OSHA','NNPC regulations','IOGP standards','IMO dangerous goods'],
ARRAY['Equipment Inspector','Commissioning Engineer','HSE Officer'],
90, true,
'{"required_fields":["equipment_description","api_spec","well_name","field_location"],"optional_fields":["rig_number","service_type"]}'::jsonb,
'{"default_vat":7.5,"petroleum_profit_tax":50,"education_tax":2}'::jsonb),

-- 2. Pharmaceuticals & Healthcare
('pharmaceuticals', 'Pharmaceuticals & Healthcare', 'Drug imports, medical equipment, vaccine distribution, and healthcare supply chain management.',
'[
  {"name":"Purchase Order & Regulatory Pre-Approval","percentage":5,"documents":["Purchase Order","NAFDAC/SAHPRA Import Permit","WHO Prequalification"],"documentMode":"required","description":"Regulatory approval obtained before procurement","requiresObserver":true},
  {"name":"GMP Audit & Batch Certification","percentage":15,"documents":["GMP Certificate","Batch Analysis Report","Certificate of Pharmaceutical Product"],"documentMode":"required","description":"Manufacturing facility audited, batch quality verified","requiresObserver":true},
  {"name":"Cold Chain Preparation & Packaging","percentage":10,"documents":["Cold Chain Protocol","Temperature Logger Calibration","Packaging Compliance Report"],"documentMode":"required","description":"Temperature-sensitive goods prepared with validated cold chain","requiresObserver":true},
  {"name":"Export & Customs Documentation","percentage":15,"documents":["Export License","Customs Declaration","Controlled Substance Permit (if applicable)"],"documentMode":"required","description":"Export clearance with controlled substance tracking","requiresObserver":true},
  {"name":"Shipping with Temperature Monitoring","percentage":20,"documents":["Air Waybill","Temperature Log Data","Insurance Certificate"],"documentMode":"required","description":"Goods in transit with continuous temperature monitoring","requiresObserver":true},
  {"name":"Import Clearance & NAFDAC/FDA Release","percentage":20,"documents":["Import Declaration","NAFDAC Release Certificate","Quality Re-Test Report"],"documentMode":"required","description":"Destination regulatory body releases goods for distribution","requiresObserver":true},
  {"name":"Delivery Verification & Payout","percentage":15,"documents":["Delivery Receipt","End-User Certificate","Temperature Compliance Report"],"documentMode":"required","description":"Goods delivered within spec, escrow released","requiresObserver":true}
]'::jsonb,
'[{"gate":"WHO Prequalification","stage":"Pre-Approval"},{"gate":"Cold Chain Protocol","stage":"Packaging"},{"gate":"Temperature Log Data","stage":"Shipping"}]'::jsonb,
ARRAY['WHO GMP','FDA 21 CFR','NAFDAC','SAHPRA','EU GDP','ICH Guidelines'],
ARRAY['Quality Assurance Pharmacist','Cold Chain Specialist','Regulatory Affairs Officer'],
60, true,
'{"required_fields":["drug_name","inn","batch_number","expiry_date","dosage_form"],"optional_fields":["therapeutic_class","shelf_life_months"]}'::jsonb,
'{"default_vat":0,"import_duty":5,"nafdac_levy":1}'::jsonb),

-- 3. Telecommunications & ICT
('telecommunications', 'Telecommunications & ICT', 'Tower construction, fiber rollouts, network equipment procurement, and managed ICT services.',
'[
  {"name":"Contract & Scope of Work","percentage":5,"documents":["Service Contract","Technical Specifications","Site Survey Report"],"documentMode":"required","description":"Project scope defined with site survey completed","requiresObserver":false},
  {"name":"Equipment Procurement & Testing","percentage":15,"documents":["Equipment Purchase Order","Factory Acceptance Test Report","CE/FCC Certification"],"documentMode":"required","description":"Network equipment procured and factory-tested","requiresObserver":true},
  {"name":"Site Preparation & Civil Works","percentage":15,"documents":["Civil Works Report","Foundation Certification","Environmental Clearance"],"documentMode":"required","description":"Tower site or fiber route prepared","requiresObserver":true},
  {"name":"Equipment Installation","percentage":25,"documents":["Installation Report","RF Coverage Test","Power System Commissioning"],"documentMode":"required","description":"Equipment mounted, connected, and powered","requiresObserver":true},
  {"name":"Network Integration & Testing","percentage":20,"documents":["Integration Test Report","Drive Test Results","KPI Benchmark Report"],"documentMode":"required","description":"Network live and meeting performance KPIs","requiresObserver":true},
  {"name":"Regulatory Compliance & License","percentage":5,"documents":["NCC/CA License","Spectrum Assignment","Type Approval Certificate"],"documentMode":"required","description":"Regulatory body approval for operation","requiresObserver":true},
  {"name":"Acceptance & Final Payout","percentage":15,"documents":["Site Acceptance Certificate","Warranty Agreement","As-Built Documentation"],"documentMode":"required","description":"Client accepts site, escrow released with warranty","requiresObserver":true}
]'::jsonb,
'[{"gate":"Factory Acceptance Test","stage":"Procurement"},{"gate":"RF Coverage Test","stage":"Installation"},{"gate":"NCC License","stage":"Compliance"}]'::jsonb,
ARRAY['ITU standards','IEEE 802','ISO 27001','NCC regulations','ICASA','3GPP'],
ARRAY['RF Engineer','Civil Inspector','Network Integration Specialist'],
120, true,
'{"required_fields":["site_id","equipment_type","technology","band_frequency"],"optional_fields":["tower_height","fiber_km"]}'::jsonb,
'{"default_vat":7.5,"telecom_tax":5,"withholding_tax":5}'::jsonb),

-- 4. Manufacturing & Industrial Equipment
('manufacturing', 'Manufacturing & Industrial Equipment', 'Factory equipment imports, industrial machinery installation, and manufacturing line commissioning.',
'[
  {"name":"Purchase Order & Technical Spec Review","percentage":5,"documents":["Purchase Order","Technical Specifications","CE/ISO Certificate"],"documentMode":"required","description":"Equipment specifications reviewed and order confirmed","requiresObserver":false},
  {"name":"Factory Acceptance Test (FAT)","percentage":15,"documents":["FAT Report","Quality Control Certificate","Calibration Records"],"documentMode":"required","description":"Equipment tested at manufacturer facility","requiresObserver":true},
  {"name":"Packaging & Shipping Preparation","percentage":10,"documents":["Packing List","Insurance Certificate","Fumigation Certificate"],"documentMode":"required","description":"Equipment secured for international transit","requiresObserver":false},
  {"name":"Shipping & Customs Clearance","percentage":20,"documents":["Bill of Lading","Import Declaration","Duty Receipt","SON Certificate"],"documentMode":"required","description":"Equipment cleared through destination customs","requiresObserver":true},
  {"name":"Site Installation","percentage":25,"documents":["Installation Report","Foundation Certificate","Electrical Compliance"],"documentMode":"required","description":"Equipment installed at buyer facility","requiresObserver":true},
  {"name":"Commissioning & Performance Test","percentage":15,"documents":["Commissioning Report","Performance Test Results","OEM Sign-Off"],"documentMode":"required","description":"Equipment tested under operating conditions","requiresObserver":true},
  {"name":"Final Acceptance & Warranty Activation","percentage":10,"documents":["Acceptance Certificate","Warranty Card","Training Completion"],"documentMode":"required","description":"Buyer accepts equipment, warranty period begins","requiresObserver":true}
]'::jsonb,
'[{"gate":"FAT Report","stage":"Factory Test"},{"gate":"SON Certificate","stage":"Customs"},{"gate":"Performance Test Results","stage":"Commissioning"}]'::jsonb,
ARRAY['ISO 9001','CE Marking','ANSI','SON','KEBS','SABS'],
ARRAY['OEM Engineer','Installation Supervisor','QA Inspector'],
90, true,
'{"required_fields":["equipment_name","model_number","manufacturer","serial_number"],"optional_fields":["warranty_months","power_requirements"]}'::jsonb,
'{"default_vat":7.5,"import_duty":10,"surcharge":7}'::jsonb),

-- 5. Renewable Energy / Solar
('renewable_energy', 'Renewable Energy / Solar', 'Solar panel procurement, wind turbine installation, mini-grid commissioning, and clean energy project financing.',
'[
  {"name":"EPC Contract & Feasibility Study","percentage":5,"documents":["EPC Contract","Feasibility Study","Environmental Impact Assessment"],"documentMode":"required","description":"Engineering, procurement, construction agreement signed with site assessment","requiresObserver":false},
  {"name":"Equipment Procurement & IEC Certification","percentage":15,"documents":["Panel/Turbine Specs","IEC 61215/61730 Certificate","Inverter Datasheet"],"documentMode":"required","description":"Equipment sourced with international certification","requiresObserver":true},
  {"name":"Shipping & Import Clearance","percentage":15,"documents":["Bill of Lading","Import Declaration","Duty Exemption Certificate"],"documentMode":"required","description":"Equipment imported (may qualify for green energy duty exemption)","requiresObserver":true},
  {"name":"Civil Works & Mounting","percentage":20,"documents":["Foundation Report","Structural Analysis","Mounting Installation Photos"],"documentMode":"required","description":"Site prepared and mounting structures installed","requiresObserver":true},
  {"name":"Electrical Installation & Grid Connection","percentage":20,"documents":["Electrical Installation Report","Grid Connection Approval","Safety Certification"],"documentMode":"required","description":"Panels/turbines connected to electrical system or mini-grid","requiresObserver":true},
  {"name":"Commissioning & Performance Ratio Test","percentage":15,"documents":["Commissioning Certificate","Performance Ratio Report","Yield Simulation vs Actual"],"documentMode":"required","description":"System commissioned with verified performance output","requiresObserver":true},
  {"name":"Handover & Final Payout","percentage":10,"documents":["O&M Manual","Warranty Certificate","Training Completion Record"],"documentMode":"required","description":"System handed over to client with documentation","requiresObserver":true}
]'::jsonb,
'[{"gate":"IEC 61215 Certificate","stage":"Procurement"},{"gate":"Grid Connection Approval","stage":"Electrical"},{"gate":"Performance Ratio Report","stage":"Commissioning"}]'::jsonb,
ARRAY['IEC 61215','IEC 61730','IRENA standards','IEEE 1547','NEC','local energy authority'],
ARRAY['Solar Engineer','Electrical Inspector','Environmental Auditor'],
120, true,
'{"required_fields":["system_capacity_kw","panel_type","inverter_type","location"],"optional_fields":["battery_storage_kwh","grid_type"]}'::jsonb,
'{"default_vat":0,"import_duty":0,"green_energy_incentive":-5}'::jsonb),

-- 6. Textiles & Apparel
('textiles', 'Textiles & Apparel', 'Fabric sourcing, garment manufacturing, fair trade compliance, and fashion export logistics.',
'[
  {"name":"Purchase Order & Design Approval","percentage":5,"documents":["Purchase Order","Design Spec Sheet","Fabric Swatch Approval"],"documentMode":"required","description":"Design specifications confirmed and fabric approved","requiresObserver":false},
  {"name":"Raw Material Sourcing & Certification","percentage":10,"documents":["GOTS Certificate","Fair Trade Certificate","Fabric Test Report"],"documentMode":"required","description":"Raw materials sourced with sustainability certification","requiresObserver":true},
  {"name":"Production Sampling & QC","percentage":15,"documents":["Pre-Production Sample Photos","AQL Inspection Report","Size Spec Sheet"],"documentMode":"required","description":"Sample approved, production quality benchmarked","requiresObserver":true},
  {"name":"Bulk Production & Mid-Line Inspection","percentage":25,"documents":["Mid-Line Inspection Report","Production Progress Photos"],"documentMode":"required","description":"Bulk production underway with quality checks","requiresObserver":true},
  {"name":"Final Inspection & Packaging","percentage":15,"documents":["Final Random Inspection Report","Packaging Compliance","Labeling Check"],"documentMode":"required","description":"Finished goods inspected and packed per spec","requiresObserver":true},
  {"name":"Shipping & Customs","percentage":20,"documents":["Bill of Lading","Certificate of Origin","Customs Declaration"],"documentMode":"required","description":"Goods exported with trade documentation","requiresObserver":true},
  {"name":"Delivery & Payment Release","percentage":10,"documents":["Delivery Receipt","Quality Acceptance Note"],"documentMode":"optional","description":"Goods received and accepted, escrow released","requiresObserver":false}
]'::jsonb,
'[{"gate":"GOTS Certificate","stage":"Sourcing"},{"gate":"AQL Inspection","stage":"Sampling"},{"gate":"Final Inspection Report","stage":"Final QC"}]'::jsonb,
ARRAY['GOTS','WRAP','ISO 3758','AGOA (African Growth and Opportunity Act)','EU textile regulations'],
ARRAY['QC Inspector','Fair Trade Auditor'],
60, true,
'{"required_fields":["product_type","fabric_composition","color","quantity_units"],"optional_fields":["style_number","wash_instructions"]}'::jsonb,
'{"default_vat":7.5,"import_duty":15,"agoa_preferential":0}'::jsonb),

-- 7. Marine & Fisheries
('marine_fisheries', 'Marine & Fisheries', 'Commercial fishing, seafood export, aquaculture, and marine resource management with catch certification.',
'[
  {"name":"Fishing License & Vessel Registration","percentage":5,"documents":["Fishing License","Vessel Registration","Crew Manifest"],"documentMode":"required","description":"Licensed vessel with registered crew","requiresObserver":false},
  {"name":"Catch Documentation & IUU Compliance","percentage":15,"documents":["Catch Certificate","IUU Declaration","Logbook Extract"],"documentMode":"required","description":"Catch documented per FAO/EU IUU regulations","requiresObserver":true},
  {"name":"Cold Chain Processing & HACCP","percentage":20,"documents":["HACCP Certificate","Processing Plant Audit","Temperature Records"],"documentMode":"required","description":"Seafood processed in certified facility with cold chain","requiresObserver":true},
  {"name":"Health Certificate & Export Clearance","percentage":15,"documents":["Health Certificate","Veterinary Certificate","Export Permit"],"documentMode":"required","description":"Government health authority clears goods for export","requiresObserver":true},
  {"name":"Shipping & Reefer Container Monitoring","percentage":20,"documents":["Bill of Lading","Reefer Temperature Log","Insurance Certificate"],"documentMode":"required","description":"Seafood shipped in monitored refrigerated container","requiresObserver":true},
  {"name":"Import Inspection & Release","percentage":15,"documents":["Import Health Check","FDA/EU Border Inspection","Customs Declaration"],"documentMode":"required","description":"Destination country inspects and releases goods","requiresObserver":true},
  {"name":"Delivery & Final Settlement","percentage":10,"documents":["Delivery Receipt","Quality Acceptance","Weight Verification"],"documentMode":"required","description":"Goods delivered within spec, escrow released","requiresObserver":false}
]'::jsonb,
'[{"gate":"IUU Declaration","stage":"Catch Documentation"},{"gate":"HACCP Certificate","stage":"Processing"},{"gate":"Health Certificate","stage":"Export Clearance"}]'::jsonb,
ARRAY['FAO CCRF','MSC','EU IUU Regulation','HACCP','Codex Alimentarius'],
ARRAY['Fisheries Observer','Cold Chain Auditor','Health Inspector'],
45, true,
'{"required_fields":["species","catch_area","vessel_name","processing_method"],"optional_fields":["fao_zone","aquaculture_site"]}'::jsonb,
'{"default_vat":0,"export_levy":2,"fisheries_fee":1}'::jsonb),

-- 8. Automotive & Vehicle Import
('automotive_import', 'Automotive & Vehicle Import', 'New and used vehicle imports, spare parts procurement, and roadworthiness certification.',
'[
  {"name":"Purchase Agreement & Vehicle Selection","percentage":5,"documents":["Purchase Agreement","Vehicle Specification Sheet","VIN Documentation"],"documentMode":"required","description":"Vehicle selected with verified identification","requiresObserver":false},
  {"name":"Pre-Shipment Inspection (PSI)","percentage":15,"documents":["PSI Certificate","Roadworthiness Report","Emissions Test"],"documentMode":"required","description":"Vehicle inspected at origin for standards compliance","requiresObserver":true},
  {"name":"Export Documentation","percentage":10,"documents":["Export Certificate","De-Registration Certificate","Invoice"],"documentMode":"required","description":"Vehicle de-registered and cleared for export","requiresObserver":false},
  {"name":"Shipping & Marine Insurance","percentage":20,"documents":["Bill of Lading","Marine Insurance","Container Loading Photos"],"documentMode":"required","description":"Vehicle shipped via RoRo or container","requiresObserver":true},
  {"name":"Import Customs & Duty Payment","percentage":25,"documents":["Import Declaration","Duty Assessment","SON/KEBS Conformity Certificate"],"documentMode":"required","description":"Vehicle cleared through customs with duty paid","requiresObserver":true},
  {"name":"Local Registration & Roadworthiness","percentage":15,"documents":["Registration Certificate","Local Roadworthiness","Insurance Policy"],"documentMode":"required","description":"Vehicle registered in destination country","requiresObserver":false},
  {"name":"Delivery & Payout Release","percentage":10,"documents":["Delivery Receipt","Key Handover Confirmation"],"documentMode":"optional","description":"Vehicle delivered to buyer, escrow released","requiresObserver":false}
]'::jsonb,
'[{"gate":"PSI Certificate","stage":"Pre-Shipment"},{"gate":"SON/KEBS Certificate","stage":"Import Customs"},{"gate":"Roadworthiness","stage":"Registration"}]'::jsonb,
ARRAY['UNECE regulations','SON','KEBS','SABS','EU End-of-Life Directive','age restriction policies'],
ARRAY['PSI Inspector','Customs Broker'],
60, true,
'{"required_fields":["make","model","year","vin","engine_cc"],"optional_fields":["color","mileage","fuel_type"]}'::jsonb,
'{"default_vat":7.5,"import_duty":35,"surcharge":15,"levies":5}'::jsonb),

-- 9. Water & Sanitation Infrastructure
('water_sanitation', 'Water & Sanitation Infrastructure', 'Borehole drilling, water treatment plants, pipeline construction, and WASH program implementation.',
'[
  {"name":"Contract & Hydrogeological Survey","percentage":5,"documents":["Construction Contract","Hydrogeological Survey","Environmental Impact Assessment"],"documentMode":"required","description":"Site surveyed and contract signed","requiresObserver":true},
  {"name":"Mobilization & Site Preparation","percentage":10,"documents":["Mobilization Report","Permit Approvals","Safety Plan"],"documentMode":"required","description":"Equipment mobilized and site prepared","requiresObserver":false},
  {"name":"Drilling / Excavation Phase","percentage":25,"documents":["Drilling Log","Geological Sample Analysis","Progress Photos"],"documentMode":"required","description":"Primary construction phase completed","requiresObserver":true},
  {"name":"Infrastructure Installation","percentage":20,"documents":["Pump Installation Report","Pipeline Test","Tank/Reservoir Completion"],"documentMode":"required","description":"Pumps, pipes, storage installed","requiresObserver":true},
  {"name":"Water Quality Testing","percentage":15,"documents":["WHO Water Quality Report","Lab Analysis Certificate","Flow Rate Test"],"documentMode":"required","description":"Water tested against WHO/national standards","requiresObserver":true},
  {"name":"Community Handover & Training","percentage":15,"documents":["Handover Certificate","O&M Training Report","Community Agreement"],"documentMode":"required","description":"System handed to community with training","requiresObserver":true},
  {"name":"Defects Liability & Final Payout","percentage":10,"documents":["Defects Inspection Report","Final Acceptance Certificate"],"documentMode":"required","description":"Defects liability period passed, escrow released","requiresObserver":false}
]'::jsonb,
'[{"gate":"Hydrogeological Survey","stage":"Survey"},{"gate":"Water Quality Report","stage":"Testing"},{"gate":"Handover Certificate","stage":"Handover"}]'::jsonb,
ARRAY['WHO WASH standards','ISO 24510','ISO 24512','national water authority regulations'],
ARRAY['Hydrogeologist','Water Quality Analyst','Community Liaison Officer'],
120, true,
'{"required_fields":["project_type","location","depth_meters","capacity_liters_per_day"],"optional_fields":["water_source_type","treatment_method"]}'::jsonb,
'{"default_vat":0,"withholding_tax":5}'::jsonb),

-- 10. Media, Film & Entertainment
('media_entertainment', 'Media, Film & Entertainment', 'Film production, music licensing, content distribution, IP royalty escrow, and creative project milestones.',
'[
  {"name":"Deal Memo & IP Agreement","percentage":10,"documents":["Deal Memo","IP License Agreement","Distribution Rights"],"documentMode":"required","description":"Creative deal terms and IP rights agreed upon","requiresObserver":false},
  {"name":"Pre-Production & Script Lockdown","percentage":10,"documents":["Approved Script","Budget Breakdown","Insurance Certificate"],"documentMode":"required","description":"Script finalized, budget approved, production insured","requiresObserver":false},
  {"name":"Principal Photography / Recording","percentage":30,"documents":["Daily Production Reports","Call Sheets","Raw Footage Log"],"documentMode":"required","description":"Main content creation phase","requiresObserver":true},
  {"name":"Post-Production & Edit Lock","percentage":20,"documents":["Edit Lock Confirmation","VFX/Sound Mix Report","Music Clearance"],"documentMode":"required","description":"Editing, VFX, sound design completed","requiresObserver":false},
  {"name":"Classification & Regulatory Clearance","percentage":10,"documents":["Film Classification Certificate","Broadcast License","Distribution Certificate"],"documentMode":"required","description":"Content rated and cleared for distribution","requiresObserver":true},
  {"name":"Delivery & Distribution","percentage":10,"documents":["Delivery Confirmation","Platform Upload Receipt","DCP/Master Copy"],"documentMode":"required","description":"Final deliverable sent to distributor/platform","requiresObserver":false},
  {"name":"Royalty Settlement & Final Payout","percentage":10,"documents":["Revenue Report","Royalty Statement","Final Invoice"],"documentMode":"optional","description":"Revenue share calculated, escrow released","requiresObserver":false}
]'::jsonb,
'[{"gate":"IP License Agreement","stage":"Deal Memo"},{"gate":"Film Classification","stage":"Regulatory"},{"gate":"Music Clearance","stage":"Post-Production"}]'::jsonb,
ARRAY['WIPO Copyright Treaty','Berne Convention','local film board regulations','FCCPC','KFCB'],
ARRAY['Line Producer','IP Attorney'],
90, false,
'{"required_fields":["project_title","content_type","format","territory"],"optional_fields":["runtime_minutes","language","genre"]}'::jsonb,
'{"default_vat":7.5,"withholding_tax":5}'::jsonb),

-- 11. Aviation & Aerospace
('aviation', 'Aviation & Aerospace', 'Aircraft parts, MRO services, charter contracts, airport infrastructure, and aviation equipment procurement.',
'[
  {"name":"Contract & Airworthiness Compliance","percentage":5,"documents":["Service Contract","Airworthiness Directive Compliance","Part 145 Certificate"],"documentMode":"required","description":"MRO or parts contract signed with regulatory compliance","requiresObserver":true},
  {"name":"Parts Procurement & Traceability","percentage":15,"documents":["Parts Purchase Order","EASA/FAA Form 8130-3","Trace Documentation"],"documentMode":"required","description":"Aviation parts procured with full traceability chain","requiresObserver":true},
  {"name":"Incoming Inspection & Certification","percentage":15,"documents":["Incoming Inspection Report","Material Certificate","Shelf Life Verification"],"documentMode":"required","description":"Parts inspected and certified upon receipt","requiresObserver":true},
  {"name":"Installation / MRO Work","percentage":25,"documents":["Work Order","Engineering Order","Progress Photos"],"documentMode":"required","description":"Parts installed or maintenance work performed","requiresObserver":true},
  {"name":"Quality Assurance & NDT Testing","percentage":15,"documents":["QA Inspection Report","NDT Test Results","Release Certificate"],"documentMode":"required","description":"Non-destructive testing and quality sign-off","requiresObserver":true},
  {"name":"Return to Service & Airworthiness","percentage":15,"documents":["Certificate of Release to Service","Airworthiness Review Certificate","Test Flight Report"],"documentMode":"required","description":"Aircraft returned to service with full documentation","requiresObserver":true},
  {"name":"Final Acceptance & Payout","percentage":10,"documents":["Customer Acceptance","Warranty Certificate","Final Invoice"],"documentMode":"required","description":"Client accepts work, escrow released","requiresObserver":true}
]'::jsonb,
'[{"gate":"Part 145 Certificate","stage":"Contract"},{"gate":"EASA Form 8130-3","stage":"Parts"},{"gate":"Certificate of Release to Service","stage":"Return to Service"}]'::jsonb,
ARRAY['ICAO Annex 8','EASA Part 145','FAA Part 43','NCAA','SACAA','local CAA regulations'],
ARRAY['Quality Inspector','Airworthiness Engineer','NDT Specialist'],
60, true,
'{"required_fields":["aircraft_type","registration","part_number","work_scope"],"optional_fields":["serial_number","tsn_hours","csn_cycles"]}'::jsonb,
'{"default_vat":0,"import_duty":0,"aviation_levy":1}'::jsonb),

-- 12. Insurance & Reinsurance
('insurance', 'Insurance & Reinsurance', 'Premium escrow, claims settlement, reinsurance treaty payments, and insurance-linked securities.',
'[
  {"name":"Policy Proposal & Underwriting","percentage":10,"documents":["Proposal Form","Risk Assessment Report","Underwriting Decision"],"documentMode":"required","description":"Risk assessed and policy terms proposed","requiresObserver":false},
  {"name":"Premium Escrow & Policy Issuance","percentage":20,"documents":["Premium Receipt","Policy Document","Schedule of Benefits"],"documentMode":"required","description":"Premium deposited in escrow, policy issued","requiresObserver":false},
  {"name":"Claim Notification & Documentation","percentage":10,"documents":["Claim Form","Loss Report","Police Report (if applicable)"],"documentMode":"required","description":"Claim filed with supporting documentation","requiresObserver":false},
  {"name":"Claims Investigation & Assessment","percentage":20,"documents":["Assessor Report","Survey Report","Medical Report (if applicable)"],"documentMode":"required","description":"Independent assessment of claim validity","requiresObserver":true},
  {"name":"Claims Adjudication","percentage":15,"documents":["Adjudication Decision","Calculation Sheet","Approval Memo"],"documentMode":"required","description":"Claim approved or denied with documented rationale","requiresObserver":true},
  {"name":"Settlement Payment","percentage":15,"documents":["Settlement Offer","Acceptance Letter","Payment Instruction"],"documentMode":"required","description":"Agreed settlement amount released from escrow","requiresObserver":false},
  {"name":"Policy Close-Out","percentage":10,"documents":["Close-Out Report","No-Claims Certificate","Renewal Offer"],"documentMode":"optional","description":"Policy period ended, final reconciliation","requiresObserver":false}
]'::jsonb,
'[{"gate":"Underwriting Decision","stage":"Underwriting"},{"gate":"Assessor Report","stage":"Investigation"},{"gate":"Adjudication Decision","stage":"Adjudication"}]'::jsonb,
ARRAY['IAIS standards','NAICOM','FSCA','IRA Kenya','Solvency II (EU reinsurers)'],
ARRAY['Loss Assessor','Actuary'],
180, false,
'{"required_fields":["policy_type","sum_insured","premium_amount","coverage_period"],"optional_fields":["deductible","beneficiary"]}'::jsonb,
'{"default_vat":0,"insurance_levy":1,"stamp_duty":0.5}'::jsonb),

-- 13. Legal & Professional Services
('legal_services', 'Legal & Professional Services', 'Retainer escrow, case-based milestone payments, expert witness fees, and professional engagement management.',
'[
  {"name":"Engagement Letter & Retainer Deposit","percentage":15,"documents":["Engagement Letter","Fee Agreement","Conflict Check"],"documentMode":"required","description":"Terms of engagement agreed, retainer deposited in escrow","requiresObserver":false},
  {"name":"Initial Research & Case Assessment","percentage":15,"documents":["Research Memo","Case Assessment Report","Timeline"],"documentMode":"required","description":"Initial legal research and case strategy developed","requiresObserver":false},
  {"name":"Document Drafting / Filing","percentage":20,"documents":["Draft Documents","Court Filing Receipt","Correspondence Log"],"documentMode":"required","description":"Key documents drafted and filed with relevant authorities","requiresObserver":false},
  {"name":"Negotiation / Mediation Phase","percentage":15,"documents":["Negotiation Summary","Settlement Proposal","Mediation Report"],"documentMode":"optional","description":"Active negotiation or mediation period","requiresObserver":true},
  {"name":"Court Proceedings / Hearing","percentage":15,"documents":["Court Order","Hearing Transcript","Expert Witness Report"],"documentMode":"required","description":"Court appearances and proceedings completed","requiresObserver":true},
  {"name":"Resolution & Outcome","percentage":10,"documents":["Judgment/Settlement Agreement","Compliance Certificate"],"documentMode":"required","description":"Case resolved with documented outcome","requiresObserver":false},
  {"name":"Final Billing & Payout","percentage":10,"documents":["Final Invoice","Time Sheet Summary","Disbursement Report"],"documentMode":"required","description":"Final fees calculated and escrow released","requiresObserver":false}
]'::jsonb,
'[{"gate":"Engagement Letter","stage":"Retainer"},{"gate":"Court Filing Receipt","stage":"Filing"},{"gate":"Judgment/Settlement","stage":"Resolution"}]'::jsonb,
ARRAY['IBA Guidelines','local bar association rules','UNCITRAL Model Law','ICC Arbitration Rules'],
ARRAY['Senior Partner','Mediator'],
180, false,
'{"required_fields":["matter_type","jurisdiction","client_name","opposing_party"],"optional_fields":["case_number","court_name"]}'::jsonb,
'{"default_vat":7.5,"withholding_tax":10}'::jsonb),

-- 14. Food & Beverage (Processed)
('food_beverage', 'Food & Beverage (Processed)', 'Processed food exports, beverage manufacturing, HACCP compliance, and international food trade.',
'[
  {"name":"Purchase Order & Compliance Pre-Check","percentage":5,"documents":["Purchase Order","NAFDAC/FDA Registration","Halal/Kosher Certificate (if applicable)"],"documentMode":"required","description":"Product registration and dietary compliance verified","requiresObserver":false},
  {"name":"Factory Audit & HACCP Verification","percentage":15,"documents":["HACCP Certificate","Factory Audit Report","ISO 22000 Certificate"],"documentMode":"required","description":"Manufacturing facility audited for food safety","requiresObserver":true},
  {"name":"Production & Batch Testing","percentage":20,"documents":["Batch Test Report","Nutritional Analysis","Shelf Life Study"],"documentMode":"required","description":"Production batch tested for quality and safety","requiresObserver":true},
  {"name":"Labeling Compliance & Packaging","percentage":10,"documents":["Label Approval","Allergen Declaration","Packaging Compliance Report"],"documentMode":"required","description":"Labels meet destination country requirements","requiresObserver":false},
  {"name":"Export Documentation & Health Certificate","percentage":15,"documents":["Health Certificate","Certificate of Origin","Phytosanitary Certificate (if applicable)"],"documentMode":"required","description":"Government health authority clears for export","requiresObserver":true},
  {"name":"Shipping & Cold Chain (if perishable)","percentage":20,"documents":["Bill of Lading","Temperature Log","Insurance Certificate"],"documentMode":"required","description":"Goods shipped with appropriate temperature control","requiresObserver":true},
  {"name":"Import Clearance & Delivery","percentage":15,"documents":["Import Declaration","FDA/NAFDAC Release","Delivery Receipt"],"documentMode":"required","description":"Goods cleared and delivered, escrow released","requiresObserver":true}
]'::jsonb,
'[{"gate":"HACCP Certificate","stage":"Factory Audit"},{"gate":"Label Approval","stage":"Labeling"},{"gate":"Health Certificate","stage":"Export"}]'::jsonb,
ARRAY['Codex Alimentarius','HACCP','ISO 22000','FDA 21 CFR','EU Food Safety Regulation','NAFDAC'],
ARRAY['Food Safety Auditor','Nutritionist','Quality Control Officer'],
45, true,
'{"required_fields":["product_name","category","batch_number","expiry_date","ingredients"],"optional_fields":["allergens","dietary_certification","shelf_life_days"]}'::jsonb,
'{"default_vat":0,"import_duty":20,"excise_duty":5}'::jsonb),

-- 15. Waste Management & Recycling
('waste_management', 'Waste Management & Recycling', 'E-waste recycling, scrap metal exports, hazardous waste disposal, and environmental compliance.',
'[
  {"name":"Contract & Waste Characterization","percentage":5,"documents":["Service Contract","Waste Characterization Report","Basel Convention Notification"],"documentMode":"required","description":"Waste classified and cross-border notification filed","requiresObserver":true},
  {"name":"Collection & Segregation","percentage":15,"documents":["Collection Manifest","Segregation Report","Weight Tickets"],"documentMode":"required","description":"Waste collected, sorted, and documented by category","requiresObserver":false},
  {"name":"Processing & Treatment","percentage":25,"documents":["Processing Report","Emissions Monitoring","Residue Analysis"],"documentMode":"required","description":"Waste processed, treated, or recycled at licensed facility","requiresObserver":true},
  {"name":"Environmental Compliance Audit","percentage":15,"documents":["Environmental Audit Report","ISO 14001 Certificate","Regulatory Inspection Report"],"documentMode":"required","description":"Processing facility passes environmental compliance audit","requiresObserver":true},
  {"name":"Export Documentation (if cross-border)","percentage":15,"documents":["Basel Convention Consent","Export License","Customs Declaration"],"documentMode":"required","description":"Cross-border movement authorized under Basel Convention","requiresObserver":true},
  {"name":"Delivery to End Processor / Smelter","percentage":15,"documents":["Delivery Receipt","Assay Report (metals)","Certificate of Destruction (e-waste)"],"documentMode":"required","description":"Material delivered to final processor or recycler","requiresObserver":true},
  {"name":"Final Report & Payout","percentage":10,"documents":["Completion Certificate","Environmental Clearance","Revenue Share Report"],"documentMode":"required","description":"Project completed, environmental compliance confirmed, escrow released","requiresObserver":false}
]'::jsonb,
'[{"gate":"Basel Convention Notification","stage":"Characterization"},{"gate":"ISO 14001 Certificate","stage":"Environmental Audit"},{"gate":"Certificate of Destruction","stage":"End Processor"}]'::jsonb,
ARRAY['Basel Convention','ISO 14001','EU WEEE Directive','local EPA regulations','Bamako Convention'],
ARRAY['Environmental Auditor','Waste Management Specialist'],
90, true,
'{"required_fields":["waste_type","classification","quantity_tonnes","origin_country"],"optional_fields":["hazard_class","recycling_method","destination_facility"]}'::jsonb,
'{"default_vat":7.5,"environmental_levy":2,"export_duty":5}'::jsonb);
