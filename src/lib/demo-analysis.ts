import { ContractAnalysis } from "./types";

export const DEMO_ANALYSIS: ContractAnalysis = {
  riskScore: 28,
  summary:
    "This lease is heavily landlord-favored with several clauses that expose the tenant to significant financial risk. The personal guarantee, uncapped rent escalation, and unrestricted CAM charges are the most concerning provisions that deviate substantially from market-standard commercial lease terms.",
  counterparty: "Meridian Property Group LLC",
  counts: {
    critical: 4,
    warning: 2,
    info: 2,
  },
  clauses: [
    {
      id: "clause-1",
      severity: "critical",
      title: "Unlimited Personal Liability Guarantee",
      originalText:
        'the individual(s) signing this Lease on behalf of Tenant hereby unconditionally and irrevocably guarantee(s), jointly and severally, the full and faithful performance of all of Tenant\'s obligations under this Lease, including but not limited to the payment of all Base Rent, Additional Rent, damages, costs, and attorneys\' fees. This guarantee shall be absolute, continuing, and unconditional, and shall remain in full force and effect throughout the entire Term of this Lease, including any extensions or holdover periods. The guarantor(s) waive all rights of subrogation, reimbursement, indemnification, and contribution, as well as any right to require Landlord to proceed against Tenant or any other person before proceeding against the guarantor(s). Landlord may proceed directly against the guarantor(s) without first pursuing any remedy against Tenant. The guarantor(s)\' personal assets, including but not limited to real property, bank accounts, investment accounts, vehicles, and other personal property, shall be subject to attachment and execution in the event of any default under this Lease.',
      location: "Section 4.2",
      explanation:
        "This means if your business can't pay rent or breaches any lease term, the landlord can come after your personal assets — your house, car, bank accounts, retirement savings, everything. The guarantee is unlimited in amount and duration, and the landlord doesn't even have to try collecting from your business first before going after you personally.",
      corporateBenchmark:
        "A Fortune 500 company's legal team would never agree to an unlimited personal guarantee. They negotiate a limited guarantee capped at 3–6 months' rent that burns off (reduces to zero) after 12–24 months of on-time rent payments. They also require the landlord to exhaust remedies against the business entity before pursuing the guarantor personally.",
      suggestedReplacement:
        'Tenant\'s personal guarantee shall be limited to an amount not to exceed three (3) months\' Base Rent. The guarantee amount shall reduce by one-third on each anniversary of the Commencement Date, provided Tenant has not been in default during the preceding twelve (12) months, such that the guarantee shall be fully extinguished after the third anniversary. Landlord shall first exhaust all remedies against Tenant before making any claim against the guarantor(s). The guarantor(s)\' liability shall be limited to the guarantee amount and shall not extend to consequential damages, attorneys\' fees, or acceleration of future rent.',
    },
    {
      id: "clause-2",
      severity: "critical",
      title: "Uncapped 7% Compounding Rent Escalation",
      originalText:
        "the Base Rent shall automatically increase by seven percent (7%) of the then-current Base Rent, compounded annually. This escalation is fixed and shall not be tied to, limited by, or adjusted based upon the Consumer Price Index or any other economic indicator. By way of illustration, if the initial Base Rent is $4,200.00 per month, the Base Rent in the second year shall be $4,494.00 per month, the Base Rent in the third year shall be $4,808.58 per month, and so forth. There shall be no cap on the cumulative amount of rent escalation over the Term.",
      location: "Section 3.1",
      explanation:
        "Your rent increases by 7% every year, compounded — that's far above typical inflation (2–3%). Starting at $4,200/month, you'd be paying $5,145/month by year 4 and $5,505/month by year 5. Over the full 5-year term, you'll pay roughly $27,000 more than if escalation were tied to CPI. If the lease auto-renews for 3 more years, it gets dramatically worse.",
      corporateBenchmark:
        "Corporate tenants negotiate rent escalation tied to CPI with a floor of 1–2% and a ceiling of 3–4%. Fixed escalations, when accepted, are typically 2–3% annually. A 7% compounding escalation is far above market and would be immediately rejected by any sophisticated tenant's counsel.",
      suggestedReplacement:
        "Commencing on the first anniversary of the Commencement Date, the Base Rent shall increase annually by the lesser of (a) three percent (3%) or (b) the percentage increase in the Consumer Price Index for All Urban Consumers (CPI-U) for the Philadelphia-Camden-Wilmington metropolitan area for the preceding twelve-month period. In no event shall the annual increase be less than one and one-half percent (1.5%) or greater than three percent (3%).",
    },
    {
      id: "clause-3",
      severity: "critical",
      title: "Exclusive Use Restriction Prevents Business Pivoting",
      originalText:
        "Tenant shall not change, alter, or modify the Permitted Use without the prior written consent of Landlord, which consent may be withheld in Landlord's sole and absolute discretion for any reason or no reason. Any change in business concept, product mix, or operating format — including but not limited to adding alcohol service, converting to a different food concept, introducing co-working or event space use, or any other material modification to the nature of Tenant's business — shall constitute a violation of this Section and an Event of Default under this Lease.",
      location: "Section 6.1",
      explanation:
        "If your coffee shop needs to pivot — say you want to add a wine bar in the evening, start hosting events, or shift to a co-working café model — you can't. The landlord can refuse any change for any reason, and even attempting to modify your business without permission is an automatic lease violation that could get you evicted. This locks you into one business model for 5+ years.",
      corporateBenchmark:
        "Corporate tenants negotiate broad use clauses (e.g., 'any lawful retail or food service use') with a reasonableness standard for landlord consent. They ensure that minor product mix changes don't require approval, and that landlord consent cannot be unreasonably withheld, conditioned, or delayed. Some negotiate a list of pre-approved alternative uses.",
      suggestedReplacement:
        'Tenant shall use the Premises for the operation of a café, restaurant, food and beverage service, co-working space, event venue, or any combination thereof, and for any other lawful commercial purpose (collectively, "Permitted Uses"). Tenant may modify its product mix, service offerings, or operating format without Landlord\'s consent, provided that any such modification is consistent with the character of the Shopping Center. Material changes to the primary business concept shall require Landlord\'s written consent, which shall not be unreasonably withheld, conditioned, or delayed. Landlord shall respond to any consent request within fifteen (15) business days, and failure to respond shall be deemed consent.',
    },
    {
      id: "clause-4",
      severity: "critical",
      title: "Triple Net Lease with Uncapped CAM Charges",
      originalText:
        "Tenant acknowledges and agrees that there shall be no cap, ceiling, or limitation on the amount of Common Area Maintenance charges or Operating Expenses that may be assessed to Tenant in any given year. Landlord shall have sole discretion in determining the scope and cost of maintenance, repairs, and improvements to the Common Areas, and Tenant shall pay its Proportionate Share regardless of the magnitude of such costs. Landlord's decision regarding the necessity or scope of any Common Area expenditure shall be final and binding.",
      location: "Section 5.2",
      explanation:
        "On top of your rent, you pay a share of ALL property taxes, insurance, and maintenance costs — with no limit. The landlord can decide to repave the parking lot, install new landscaping, or make any \"improvement\" they want, and you're on the hook for 8.5% of the cost with no say in the matter. Your actual monthly costs could be significantly higher than the base rent.",
      corporateBenchmark:
        "Corporate tenants always negotiate CAM caps — typically limiting year-over-year increases to 3–5% of the prior year's charges. They also negotiate exclusions for capital expenditures, management fees above a fixed percentage (usually 3–5%), landlord's legal fees, and costs arising from landlord's negligence. Many require an annual reconciliation with audit rights.",
      suggestedReplacement:
        "Tenant's Proportionate Share of Common Area Maintenance charges shall not increase by more than four percent (4%) per year over the prior year's actual charges (the \"CAM Cap\"). Capital expenditures shall be amortized over their useful life. The following shall be excluded from Operating Expenses: (a) costs arising from Landlord's negligence; (b) management fees in excess of four percent (4%) of gross rents; (c) costs of any lawsuit not involving Tenant; (d) depreciation. Landlord shall provide Tenant with an annual reconciliation statement within ninety (90) days of each calendar year-end, and Tenant shall have the right to audit Landlord's books and records pertaining to Operating Expenses upon reasonable notice.",
    },
    {
      id: "clause-5",
      severity: "warning",
      title: "90-Day Notice with Automatic 3-Year Renewal",
      originalText:
        "Unless Tenant provides written notice of its intent not to renew no fewer than ninety (90) days prior to the expiration of the then-current Term, this Lease shall automatically renew for one (1) additional period of three (3) years, upon the same terms and conditions set forth herein (including the rent escalation provisions of Section 3.1).",
      location: "Section 7.1",
      explanation:
        "If you forget to send a written notice exactly 90 days before your lease expires, you're automatically locked in for 3 more years — at the same 7% compounding rent escalation. That's a common trap: you're busy running your business, miss the deadline by a week, and suddenly you owe 3 more years of rent. Many landlords count on tenants missing this deadline.",
      corporateBenchmark:
        "Corporate tenants negotiate shorter notice periods (30–60 days), renewal terms of 1 year rather than 3, and often require the landlord to send a reminder notice 120 days before the deadline. Some negotiate a mutual option where renewal must be affirmatively elected by both parties rather than automatic.",
      suggestedReplacement:
        "Either party may elect to renew this Lease for one (1) additional period of one (1) year by providing written notice no fewer than sixty (60) days prior to the expiration of the then-current Term. Landlord shall send Tenant a written reminder of the renewal deadline no fewer than one hundred twenty (120) days prior to the expiration of the Term. In the absence of a timely renewal election by either party, this Lease shall expire at the end of the then-current Term without further obligation by either party, except for obligations that expressly survive termination.",
    },
    {
      id: "clause-6",
      severity: "warning",
      title: "Landlord Can Force Relocation to Different Unit",
      originalText:
        "Landlord reserves the right, upon sixty (60) days' written notice, to relocate Tenant to another unit within the Shopping Center of comparable or greater size. Landlord shall bear the reasonable costs of physically moving Tenant's furniture, fixtures, and equipment. Tenant agrees that upon such relocation, this Lease shall continue in full force and effect with respect to the new premises, and the Base Rent shall remain unchanged. Tenant waives any claims for loss of business, loss of goodwill, or any other consequential damages arising from such relocation.",
      location: "Section 8.1",
      explanation:
        "The landlord can move your business to a different unit in the shopping center with just 60 days' notice. While they pay for the physical move, you waive all claims for lost business during the disruption. If you've built up foot traffic and customer habits tied to your current corner location, being moved to a back unit could devastate your revenue — and you have no recourse.",
      corporateBenchmark:
        "Corporate tenants either strike relocation clauses entirely or negotiate strict conditions: relocation only if the replacement space is substantially similar in location, visibility, and foot traffic; full reimbursement of all costs including signage, business cards, marketing materials, and lost revenue during transition; right to terminate the lease if the new space is unacceptable; and a cap on the number of relocations (typically one during the entire term).",
      suggestedReplacement:
        "Landlord shall have the right to relocate Tenant only with Tenant's prior written consent, which shall not be unreasonably withheld if the proposed replacement space is of comparable size, visibility, foot traffic, and accessibility. In the event of any relocation: (a) Landlord shall bear all costs including moving, signage replacement, customer notification, and marketing materials; (b) Tenant shall receive an abatement of Base Rent for the period during which business operations are disrupted; (c) Tenant may terminate this Lease upon thirty (30) days' notice if the relocation materially adversely affects Tenant's business operations. Landlord may exercise this right no more than once during the Term.",
    },
    {
      id: "clause-7",
      severity: "info",
      title: "Lease Subordinate to Future Mortgages",
      originalText:
        "This Lease and all of Tenant's rights hereunder are and shall be subject and subordinate to any and all mortgages, deeds of trust, ground leases, and other encumbrances now or hereafter placed upon the Shopping Center or any part thereof, and to all renewals, modifications, consolidations, replacements, and extensions thereof. Tenant agrees that in the event of foreclosure or other transfer of Landlord's interest, the successor owner shall have the right, at its sole option, to either honor this Lease or terminate it upon thirty (30) days' notice to Tenant, regardless of the remaining Term.",
      location: "Section 9.1",
      explanation:
        "If your landlord defaults on their mortgage and the bank forecloses, the new owner can choose to terminate your lease with just 30 days' notice — even if you have years left on your term and have invested heavily in building out the space. Your lease is treated as less important than the bank's mortgage.",
      corporateBenchmark:
        "Corporate tenants require a Subordination, Non-Disturbance, and Attornment Agreement (SNDA) from the landlord's lender. An SNDA ensures that even in foreclosure, the new owner must honor the existing lease as long as the tenant isn't in default. This is a standard protection that any commercial tenant should request.",
      suggestedReplacement:
        "This Lease shall be subordinate to any mortgage or deed of trust now or hereafter placed upon the Shopping Center, provided that the holder of such mortgage or deed of trust enters into a Subordination, Non-Disturbance and Attornment Agreement (\"SNDA\") with Tenant, in form reasonably acceptable to Tenant, providing that Tenant's rights under this Lease shall not be disturbed so long as Tenant is not in default. Landlord shall use commercially reasonable efforts to obtain an SNDA from its current and any future lender within thirty (30) days of Tenant's request.",
    },
    {
      id: "clause-8",
      severity: "info",
      title: "Aggressive Late Fee and Interest Structure",
      originalText:
        "In the event any payment of Rent is not received by Landlord within three (3) business days after the due date, Tenant shall pay a late fee equal to ten percent (10%) of the overdue amount. This late fee is in addition to any interest on overdue amounts, which shall accrue at the rate of 1.5% per month (18% per annum) from the due date until paid.",
      location: "Section 10.2",
      explanation:
        "If your rent is even 4 days late, you owe an extra 10% penalty PLUS 18% annual interest. On a $4,200 rent payment, that's a $420 penalty. While late fees are common in commercial leases, the 3-day grace period is very short, and stacking a 10% fee with 18% interest is on the aggressive side of market norms.",
      corporateBenchmark:
        "Corporate tenants negotiate a 5–10 day grace period, late fees of 3–5% (not 10%), and interest at the prime rate plus 2–3% rather than a flat 18%. They also ensure late fees aren't triggered by disputed amounts or payments delayed by bank processing times.",
      suggestedReplacement:
        "In the event any payment of Rent is not received by Landlord within seven (7) business days after the due date, Tenant shall pay a late fee equal to five percent (5%) of the overdue amount. Interest on overdue amounts shall accrue at the prime rate published by the Wall Street Journal plus two percent (2%) per annum. Late fees shall not apply to any amounts that are the subject of a good-faith dispute between the parties, provided Tenant has notified Landlord of such dispute in writing.",
    },
  ],
};
