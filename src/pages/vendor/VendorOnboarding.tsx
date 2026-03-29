import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Store, Wrench, ArrowRight, ArrowLeft, CheckCircle, Upload, Globe, Info } from "lucide-react";

import { ALL_INDUSTRIES } from "@/lib/industryList";

const industryOptions = [
  ...ALL_INDUSTRIES,
  { value: "other", label: "Other", milestone: false },
];

const serviceCategories = [
  {
    id: "professional",
    label: "Professional Services",
    desc: "Consulting, development, legal, accounting",
    subTypes: [
      { id: "project-milestone", label: "Project-Based / Milestones", desc: "Software dev, construction, consulting projects" },
      { id: "retainer", label: "Retainer / Recurring", desc: "Monthly service agreements, ongoing support" },
    ],
  },
  {
    id: "hospitality",
    label: "Hospitality & Travel",
    desc: "Hotels, Airbnb, tour operators, restaurants",
    subTypes: [
      { id: "booking", label: "Booking-Based", desc: "Hotel stays, Airbnb, tour packages" },
      { id: "ticket", label: "Ticket / Event-Based", desc: "Event tickets, concert passes, tours" },
    ],
  },
  {
    id: "real-estate",
    label: "Real Estate & Assets",
    desc: "Property sales, rentals, vehicle sales",
    subTypes: [
      { id: "asset-transfer", label: "Asset-Transfer", desc: "Property purchase, vehicle sale, high-value assets" },
      { id: "rental", label: "Rental / Lease", desc: "Monthly rent, equipment lease" },
    ],
  },
  {
    id: "digital",
    label: "Digital Services",
    desc: "SaaS, digital products, online courses",
    subTypes: [
      { id: "subscription", label: "Subscription-Based", desc: "SaaS, memberships, recurring digital access" },
      { id: "one-time-digital", label: "One-Time Digital Delivery", desc: "Templates, licenses, digital downloads" },
    ],
  },
  {
    id: "logistics",
    label: "Logistics & Trade",
    desc: "Freight, import/export, warehousing",
    subTypes: [
      { id: "shipment-milestone", label: "Shipment Milestones", desc: "Cargo tracking with checkpoint-based release" },
    ],
  },
  {
    id: "education",
    label: "Education & Training",
    desc: "Courses, tutoring, certifications",
    subTypes: [
      { id: "course-milestone", label: "Course Milestones", desc: "Module-based payout as lessons complete" },
    ],
  },
];

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [vendorType, setVendorType] = useState<"product" | "service" | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [primaryIndustry, setPrimaryIndustry] = useState("");
  const [platformDescription, setPlatformDescription] = useState("");
  const [defaultOrderType, setDefaultOrderType] = useState<"simple" | "milestone" | "hybrid">("simple");

  const selectedIndustryInfo = industryOptions.find(i => i.value === primaryIndustry);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      // Remove sub-types of unchecked categories
      if (!next.includes(id)) {
        const cat = serviceCategories.find((c) => c.id === id);
        if (cat) {
          setSelectedSubTypes((st) => st.filter((s) => !cat.subTypes.some((sub) => sub.id === s)));
        }
      }
      return next;
    });
  };

  const toggleSubType = (id: string) => {
    setSelectedSubTypes((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const canProceed = () => {
    if (step === 1) return vendorType !== null;
    if (step === 2) return vendorType === "product" || (selectedCategories.length > 0 && selectedSubTypes.length > 0);
    if (step === 3) return businessName.trim() !== "" && businessLocation.trim() !== "" && primaryIndustry !== "";
    return true;
  };

  const handleComplete = () => {
    localStorage.setItem("tl_vendor_auth", "true");
    localStorage.setItem("tl_vendor_network", "testnet");
    localStorage.setItem("tl_vendor_onboarded", "true");
    localStorage.setItem("tl_vendor_industry", primaryIndustry);
    localStorage.setItem("tl_vendor_order_type", defaultOrderType);
    if (platformDescription.trim()) localStorage.setItem("tl_vendor_platform_desc", platformDescription);
    navigate("/trustlock/vendor");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Store className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Vendor Onboarding</h1>
            <p className="text-xs text-muted-foreground">Step {step} of 4</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 max-w-md mx-auto">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 4 && <div className={`flex-1 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Vendor Type */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle>What type of vendor are you?</CardTitle>
                  <CardDescription>This determines your dashboard layout and escrow logic</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <button
                    onClick={() => setVendorType("product")}
                    className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left ${vendorType === "product" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold">Product Vendor</h3>
                      <p className="text-sm text-muted-foreground mt-1">I sell physical goods — clothing, electronics, crafts, food products, etc.</p>
                      <p className="text-xs text-muted-foreground mt-2">Flow: Paid → Shipped → Delivered → Released</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setVendorType("service")}
                    className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left ${vendorType === "service" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Wrench className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold">Service Vendor</h3>
                      <p className="text-sm text-muted-foreground mt-1">I provide services — hospitality, consulting, real estate, education, digital services, etc.</p>
                      <p className="text-xs text-muted-foreground mt-2">Flow varies by service type (milestones, bookings, subscriptions, etc.)</p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Categories (service) or skip (product) */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle>{vendorType === "service" ? "Select your service categories" : "Product vendor setup"}</CardTitle>
                  <CardDescription>
                    {vendorType === "service"
                      ? "Choose all that apply — you can update these later. Then select sub-types within each category."
                      : "Your dashboard will be configured for product tracking with shipping-based escrow."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {vendorType === "service" ? (
                    <div className="space-y-4">
                      {serviceCategories.map((cat) => (
                        <div key={cat.id} className={`rounded-xl border-2 transition-all ${selectedCategories.includes(cat.id) ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                          <label className="flex items-start gap-3 p-4 cursor-pointer">
                            <Checkbox checked={selectedCategories.includes(cat.id)} onCheckedChange={() => toggleCategory(cat.id)} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">{cat.label}</h4>
                                {selectedCategories.includes(cat.id) && <Badge className="bg-primary/15 text-primary text-[10px]">Selected</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{cat.desc}</p>
                            </div>
                          </label>
                          {selectedCategories.includes(cat.id) && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-4 pb-4 ml-7 space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Sub-types:</p>
                              {cat.subTypes.map((sub) => (
                                <label key={sub.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedSubTypes.includes(sub.id) ? "border-accent/30 bg-accent/5" : "border-border hover:bg-muted/30"}`}>
                                  <Checkbox checked={selectedSubTypes.includes(sub.id)} onCheckedChange={() => toggleSubType(sub.id)} className="mt-0.5" />
                                  <div>
                                    <span className="text-sm font-medium">{sub.label}</span>
                                    <p className="text-xs text-muted-foreground">{sub.desc}</p>
                                  </div>
                                </label>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-xl p-6 text-center space-y-3">
                      <Store className="w-12 h-12 mx-auto text-primary" />
                      <h3 className="font-heading font-bold text-lg">Product Dashboard Ready</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Your dashboard will include shipping tracking, delivery confirmation flows, and product-specific escrow management.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Business Info + Industry Config */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>Tell us about your business and industry — this configures your checkout widget</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g., Kente Craft Ltd" />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Location *</Label>
                    <Input value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} placeholder="e.g., Accra, Ghana" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website (optional)</Label>
                    <Input value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} placeholder="e.g., www.kentecraft.com" />
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <h3 className="font-heading font-bold text-sm">Industry & Order Configuration</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This determines how the TrustLock Pay widget behaves on your platform — what type of orders it expects and whether milestone-based agreements are enabled.
                    </p>

                    <div className="space-y-2">
                      <Label>Primary Industry *</Label>
                      <Select value={primaryIndustry} onValueChange={(val) => {
                        setPrimaryIndustry(val);
                        const info = industryOptions.find(i => i.value === val);
                        if (info?.milestone) setDefaultOrderType("milestone");
                        else setDefaultOrderType("simple");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industryOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                              {opt.milestone && " ⚙️"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {primaryIndustry && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Default Order Type</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setDefaultOrderType("simple")}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${defaultOrderType === "simple" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                            >
                              <p className="text-xs font-semibold">Simple</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Pay → Ship → Release</p>
                            </button>
                            <button
                              onClick={() => setDefaultOrderType("milestone")}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${defaultOrderType === "milestone" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                            >
                              <p className="text-xs font-semibold">Milestone</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Staged payments</p>
                            </button>
                            <button
                              onClick={() => setDefaultOrderType("hybrid")}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${defaultOrderType === "hybrid" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                            >
                              <p className="text-xs font-semibold">Hybrid</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Both types</p>
                            </button>
                          </div>
                        </div>

                        {selectedIndustryInfo?.milestone && defaultOrderType === "simple" && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-700">
                              <strong>{selectedIndustryInfo.label}</strong> typically uses milestone-based orders. You can still choose "Simple" but buyers may request milestones per order.
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Describe your platform (optional)</Label>
                          <Textarea
                            value={platformDescription}
                            onChange={(e) => setPlatformDescription(e.target.value)}
                            placeholder="e.g., We build residential homes in Accra with 4-6 month project timelines..."
                            className="text-sm min-h-[60px]"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Helps our team pre-configure your milestone templates and compliance requirements.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: KYC Upload */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Identity Verification</CardTitle>
                  <CardDescription>Upload your documents to start at Tier 1. You can upgrade later.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Government-Issued ID", desc: "Passport, driver's license, or national ID", required: true },
                    { label: "Selfie with ID", desc: "Take a photo holding your ID next to your face", required: true },
                    { label: "Business Registration (optional)", desc: "For Tier 2 verification — business license or certificate", required: false },
                  ].map((doc) => (
                    <div key={doc.label} className="flex items-start gap-4 p-4 rounded-xl border border-border">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">{doc.label}</h4>
                          {doc.required && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.desc}</p>
                      </div>
                      <Button variant="outline" size="sm">Upload</Button>
                    </div>
                  ))}
                  <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                    Your documents will be reviewed within 24 hours. You can start using the platform immediately with limited access.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete}>
              Complete Setup <CheckCircle className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VendorOnboarding;
