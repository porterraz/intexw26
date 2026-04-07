import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";

interface Section {
  id: string;
  title: string;
  content: ReactNode;
}

const LAST_UPDATED = "June 1, 2025";
const CONTROLLER_EMAIL = "privacidade@novapath.org.br";
const DPO_EMAIL = "dpo@novapath.org.br";
const ORG_ADDRESS =
  "Rua das Acacias, 142 - Sala 8, Belo Horizonte - MG, 30130-010, Brasil";

function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-surface-text leading-relaxed text-[15px] mb-4 last:mb-0">
      {children}
    </p>
  );
}

function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-semibold text-surface-dark text-base mt-8 mb-3 first:mt-0">
      {children}
    </h3>
  );
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mb-4" role="list">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-surface-text text-[15px]">
          <span
            aria-hidden="true"
            className="mt-[6px] shrink-0 w-1.5 h-1.5 rounded-full bg-accent"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto mb-4 rounded-xl border border-brand-100 bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr
            style={{
              background: "linear-gradient(90deg,color-mix(in srgb, var(--color-brand) 8%, transparent),color-mix(in srgb, var(--color-accent) 5%, transparent))",
            }}
          >
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-accent border-b border-brand-100"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-brand-100 last:border-0 hover:bg-brand-50 transition-colors"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-3 text-surface-text text-[13px] leading-relaxed align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  icon,
  children,
}: {
  icon: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex gap-4 rounded-xl p-4 mb-6 border"
      style={{
        background: "color-mix(in srgb, var(--color-brand) 5%, transparent)",
        borderColor: "color-mix(in srgb, var(--color-brand) 15%, transparent)",
      }}
    >
      <span className="text-xl shrink-0" role="img" aria-hidden="true">
        {icon}
      </span>
      <div className="text-[14px] text-surface-text leading-relaxed">{children}</div>
    </div>
  );
}

const sections: Section[] = [
  {
    id: "introduction",
    title: "1. Introduction & Controller Identity",
    content: (
      <>
        <Callout icon="🛡️">
          Nova Path is deeply committed to protecting the privacy and dignity of
          every individual we serve - especially vulnerable safehouse residents
          whose safety may depend on strict data confidentiality.
        </Callout>
        <P>
          This Privacy Policy ("Policy") describes how <strong className="text-surface-dark">Nova Path</strong> (
          <em>Associacao Nova Path</em>), a non-profit organization registered in
          Brazil under CNPJ 00.000.000/0001-00, collects, uses, stores,
          discloses, and protects personal data in connection with our websites,
          applications, safehouse programs, home visitation services, and donor
          relations.
        </P>
        <P>
          Nova Path is the <strong className="text-surface-dark">data controller</strong> for the purposes of:
        </P>
        <UL
          items={[
            "Brazil's Lei Geral de Protecao de Dados Pessoais (LGPD) - Law No. 13,709/2018",
            "The European Union's General Data Protection Regulation (GDPR) - Regulation (EU) 2016/679, where applicable to EU-resident donors or partners",
            "Any other applicable national privacy legislation",
          ]}
        />
        <P>
          <strong className="text-surface-dark">Data Controller contact:</strong>{" "}
          <a
            href={`mailto:${CONTROLLER_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand-dark"
          >
            {CONTROLLER_EMAIL}
          </a>
          <br />
          <strong className="text-surface-dark">Registered address:</strong> {ORG_ADDRESS}
        </P>
      </>
    ),
  },
  {
    id: "dpo",
    title: "2. Data Protection Officer",
    content: (
      <>
        <P>
          Nova Path has appointed a Data Protection Officer (DPO) to oversee
          compliance with this Policy and applicable data protection law. You
          may contact our DPO at any time:
        </P>
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-5 py-4 mb-4 space-y-1 text-[14px]">
          <p className="text-surface-dark font-medium">Data Protection Officer</p>
          <p className="text-surface-text">Nova Path - Associacao Nova Path</p>
          <p className="text-surface-text">{ORG_ADDRESS}</p>
          <a
            href={`mailto:${DPO_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand-dark block"
          >
            {DPO_EMAIL}
          </a>
        </div>
        <P>
          Complaints may also be directed to Brazil's national data protection
          authority, the{" "}
          <strong className="text-surface-dark">
            Autoridade Nacional de Protecao de Dados (ANPD)
          </strong>
          , or, for EU residents, to the relevant supervisory authority in your
          country of residence.
        </P>
      </>
    ),
  },
  {
    id: "categories",
    title: "3. Categories of Personal Data We Process",
    content: (
      <>
        <P>
          We collect and process different categories of data depending on your
          relationship with Nova Path. We only collect what is strictly necessary
          for the stated purpose (data minimisation).
        </P>
        <H3>3.1 Safehouse Residents & Programme Participants</H3>
        <Callout icon="⚠️">
          Resident data is treated as <strong>sensitive / special-category data</strong>.
          Access is restricted to vetted staff on a strict need-to-know basis.
          All records are encrypted at rest and in transit.
        </Callout>
        <UL
          items={[
            "Full legal name, date of birth, national ID (CPF/RG)",
            "Current and prior addresses - handled with extreme confidentiality",
            "Health information relevant to care planning (with explicit consent or vital-interest basis)",
            "Family composition and dependency information",
            "Case history, case notes, and process recordings",
            "Court orders, protective measures, and legal documentation",
            "Emergency contact details",
          ]}
        />
        <H3>3.2 Donors & Financial Contributors</H3>
        <UL
          items={[
            "Full name and contact information (email, phone, address)",
            "Payment information - processed exclusively via PCI-DSS-certified payment processors; Nova Path never stores raw card data",
            "Donation history, amounts, frequency, and campaigns",
            "Communication preferences and opt-in records",
            "Tax receipt details (CPF/CNPJ for Brazilian donors; fiscal identifiers for international donors)",
          ]}
        />
        <H3>3.3 Website Visitors</H3>
        <UL
          items={[
            "IP address and approximate geolocation",
            "Browser type, device identifiers, and operating system",
            "Pages visited, referral source, and session duration",
            "Cookie identifiers (see Section 8)",
          ]}
        />
        <H3>3.4 Employees, Volunteers & Field Workers</H3>
        <UL
          items={[
            "Employment and identification records",
            "Background check results (where legally required)",
            "Training certifications and home visitation logs",
          ]}
        />
      </>
    ),
  },
  {
    id: "purposes",
    title: "4. Purposes & Legal Bases for Processing",
    content: (
      <>
        <P>
          We only process personal data where we have a valid legal basis. The
          table below sets out our primary processing activities.
        </P>
        <Table
          headers={["Purpose", "Data Categories", "Legal Basis (LGPD / GDPR)"]}
          rows={[
            [
              "Providing safehouse shelter and resident care",
              "Resident records, health data, case notes",
              "Vital interest (Art. 7 IX LGPD / Art. 6(1)(d) GDPR); Public interest; Explicit consent where required",
            ],
            [
              "Conducting home visitation assessments",
              "Resident & family data, visit logs",
              "Legitimate interest; Legal obligation; Explicit consent",
            ],
            [
              "Managing donations and issuing tax receipts",
              "Donor identity, payment data, donation history",
              "Performance of contract / donation agreement; Legal obligation (fiscal compliance)",
            ],
            [
              "Communicating impact updates to donors",
              "Contact details, communication preferences",
              "Consent; Legitimate interest (existing donors)",
            ],
            [
              "Website analytics and improvement",
              "Cookie data, IP, session data",
              "Consent (non-essential cookies); Legitimate interest (essential analytics)",
            ],
            [
              "Legal compliance and regulatory reporting",
              "All categories as required",
              "Legal obligation (Art. 7 II LGPD / Art. 6(1)(c) GDPR)",
            ],
            [
              "Staff and volunteer management",
              "HR and credentialing records",
              "Employment contract; Legal obligation",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "resident-data",
    title: "5. Special Protections for Resident Data",
    content: (
      <>
        <Callout icon="🔒">
          The physical and psychological safety of safehouse residents is our
          highest obligation. We apply the most stringent data-protection
          controls to all resident records.
        </Callout>
        <P>
          Given the acute risk of harm to individuals fleeing domestic violence,
          trafficking, or other dangerous situations, Nova Path implements the
          following additional safeguards for resident data:
        </P>
        <H3>Access Controls</H3>
        <UL
          items={[
            "Role-based access: only the assigned caseworker and their direct supervisor may access a resident's full record",
            "All access events are logged in an immutable audit trail",
            "Physical case files are stored in locked facilities with keycard access",
          ]}
        />
        <H3>Location & Identifying Information</H3>
        <UL
          items={[
            "Safehouse addresses are classified as restricted and are never published or included in any digital system accessible via the public internet",
            "Residents are assigned anonymous case identifiers in shared systems",
            "Third parties (including law enforcement) may only obtain location data pursuant to a valid court order; Nova Path will notify residents to the extent legally permissible",
          ]}
        />
        <H3>Retention</H3>
        <P>
          Resident case records are retained for a minimum of{" "}
          <strong className="text-surface-dark">5 years</strong> following case closure,
          as required by Brazilian social-care regulations (Lei Organica da
          Assistencia Social - LOAS), and securely deleted thereafter unless
          ongoing legal proceedings require extended retention.
        </P>
        <H3>Process Recordings</H3>
        <P>
          Audio or video recordings made during case assessments are stored with
          AES-256 encryption, accessible only to the supervising caseworker and
          DPO, and are never shared externally without explicit written consent
          from the subject or a binding court order.
        </P>
      </>
    ),
  },
  {
    id: "donor-data",
    title: "6. Donor Financial Data",
    content: (
      <>
        <P>
          Nova Path processes donor financial records with the highest standards
          of security and transparency.
        </P>
        <H3>Payment Processing</H3>
        <P>
          All financial transactions are processed by PCI-DSS Level 1 certified
          third-party payment processors (currently{" "}
          <strong className="text-surface-dark">Stripe</strong> and{" "}
          <strong className="text-surface-dark">PagSeguro</strong>). Nova Path does not
          receive, store, or transmit raw card numbers, CVVs, or bank account
          credentials. Tokenised payment references used for recurring donations
          are stored by the processor, not by Nova Path.
        </P>
        <H3>Donation Records</H3>
        <UL
          items={[
            "Donation amounts and dates are retained for 10 years to comply with Brazilian tax and accounting law (Lei 9.430/1996)",
            "Donor identities are never sold, rented, or traded with any commercial third party",
            "Aggregate, anonymised impact data may be published in our annual reports",
          ]}
        />
        <H3>Donor Rights</H3>
        <P>
          Donors may request a complete record of their donation history, update
          their contact preferences, or request deletion of marketing data at any
          time by writing to{" "}
          <a
            href={`mailto:${CONTROLLER_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand-dark"
          >
            {CONTROLLER_EMAIL}
          </a>
          . Note that records required for legal compliance (e.g., fiscal
          records) cannot be deleted before the legally mandated retention period
          expires.
        </P>
      </>
    ),
  },
  {
    id: "sharing",
    title: "7. Data Sharing & Third Parties",
    content: (
      <>
        <P>
          Nova Path does not sell personal data. We share data only in the
          following limited circumstances:
        </P>
        <Table
          headers={["Recipient", "Data Shared", "Safeguard"]}
          rows={[
            [
              "Payment processors (Stripe, PagSeguro)",
              "Donor name, amount, date",
              "PCI-DSS certified; Data Processing Agreement in place",
            ],
            [
              "Cloud infrastructure (AWS Sao Paulo region)",
              "Encrypted resident and donor data",
              "ISO 27001; AWS DPA; data residency in Brazil",
            ],
            [
              "Government social-care bodies (CRAS/CREAS)",
              "Anonymised or consented resident referral data",
              "Legal obligation or explicit consent; minimum necessary",
            ],
            [
              "Legal / judicial authorities",
              "As required by valid court order",
              "Nova Path reviews all requests and notifies subjects where permitted",
            ],
            [
              "Partner NGOs (case transfers)",
              "Consented transfer summary",
              "Formal data-sharing agreement; resident written consent",
            ],
            [
              "Email platform (e.g., Brevo)",
              "Donor name and email",
              "DPA in place; EU-adequacy or SCCs where applicable",
            ],
          ]}
        />
        <P>
          All third-party processors are bound by Data Processing Agreements
          (DPAs) that restrict their use of personal data to the stated purpose
          and require equivalent security standards.
        </P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "8. Cookies & Tracking Technologies",
    content: (
      <>
        <P>
          Our website uses cookies and similar technologies. You can manage your
          preferences through the cookie banner displayed on your first visit, or
          at any time via your browser settings.
        </P>
        <Table
          headers={["Cookie Name", "Type", "Purpose", "Duration"]}
          rows={[
            [
              "novapath_cookie_consent",
              "Essential",
              "Stores your cookie consent choice so the banner doesn't reappear",
              "1 year",
            ],
            [
              "np_session",
              "Essential",
              "Maintains your authenticated session (authenticated users only)",
              "Session",
            ],
            [
              "_ga, _ga_*",
              "Analytical (consent-gated)",
              "Google Analytics - aggregate page-view and traffic statistics",
              "2 years",
            ],
            [
              "_fbp",
              "Marketing (consent-gated)",
              "Facebook Pixel - measures donation campaign reach (disabled by default)",
              "90 days",
            ],
          ]}
        />
        <P>
          Essential cookies are set without consent as they are strictly
          necessary for the website to function. All non-essential cookies
          (analytical, marketing) are loaded only after you click{" "}
          <strong className="text-surface-dark">Accept</strong> in the cookie banner.
          Clicking <strong className="text-surface-dark">Decline</strong> will prevent
          any non-essential cookies from being set during your session.
        </P>
        <P>
          You may withdraw consent at any time by clearing your cookies or
          contacting us at{" "}
          <a
            href={`mailto:${CONTROLLER_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand-dark"
          >
            {CONTROLLER_EMAIL}
          </a>
          .
        </P>
      </>
    ),
  },
  {
    id: "transfers",
    title: "9. International Data Transfers",
    content: (
      <>
        <P>
          Nova Path stores all primary data in AWS infrastructure located in the{" "}
          <strong className="text-surface-dark">Sao Paulo (sa-east-1)</strong> region,
          ensuring data residency within Brazil. Where data is processed by
          third-party services headquartered outside Brazil (e.g., payment
          processors, email platforms), we ensure transfers are protected by:
        </P>
        <UL
          items={[
            "Standard Contractual Clauses (SCCs) approved by the European Commission, for transfers to or from the EU/EEA",
            "Adequacy assessments under LGPD Art. 33, or equivalent contractual guarantees",
            "Data Processing Agreements requiring the recipient to maintain equivalent security standards",
          ]}
        />
      </>
    ),
  },
  {
    id: "security",
    title: "10. Security Measures",
    content: (
      <>
        <P>
          Nova Path employs a layered security architecture appropriate to the
          sensitivity of the data we hold:
        </P>
        <UL
          items={[
            "AES-256 encryption for all data at rest; TLS 1.3 for all data in transit",
            "Multi-factor authentication (MFA) enforced for all staff system access",
            "Annual third-party penetration testing and quarterly vulnerability scanning",
            "Immutable access logs and anomaly detection on all databases containing resident data",
            "Incident response plan with a maximum 72-hour breach notification window (compliant with LGPD Art. 48 and GDPR Art. 33)",
            "Staff data-protection training conducted semi-annually",
          ]}
        />
        <P>
          Despite these measures, no system is completely immune to security
          incidents. In the event of a breach affecting your personal data, we
          will notify you and the relevant supervisory authority as required by
          law.
        </P>
      </>
    ),
  },
  {
    id: "rights",
    title: "11. Your Rights",
    content: (
      <>
        <P>
          Depending on your location and the legal basis for processing, you may
          have the following rights regarding your personal data:
        </P>
        <Table
          headers={["Right", "Description", "How to Exercise"]}
          rows={[
            [
              "Access (Art. 18 I LGPD / Art. 15 GDPR)",
              "Obtain a copy of the personal data we hold about you",
              `Email ${CONTROLLER_EMAIL}`,
            ],
            [
              "Correction (Art. 18 III LGPD / Art. 16 GDPR)",
              "Request correction of inaccurate or incomplete data",
              `Email ${CONTROLLER_EMAIL}`,
            ],
            [
              "Deletion (Art. 18 VI LGPD / Art. 17 GDPR)",
              "Request erasure of data no longer necessary for its purpose (subject to legal retention obligations)",
              `Email ${CONTROLLER_EMAIL}`,
            ],
            [
              "Portability (Art. 18 V LGPD / Art. 20 GDPR)",
              "Receive your data in a structured, machine-readable format",
              `Email ${CONTROLLER_EMAIL}`,
            ],
            [
              "Objection / Restriction (Art. 18 IX LGPD / Art. 21 GDPR)",
              "Object to processing based on legitimate interest, or restrict processing while a dispute is resolved",
              `Email ${CONTROLLER_EMAIL}`,
            ],
            [
              "Withdraw Consent",
              "Where processing is based on consent, withdraw it at any time without affecting prior lawful processing",
              "Cookie banner or email",
            ],
            [
              "Lodge a Complaint",
              "File a complaint with the ANPD (Brazil) or your national supervisory authority (EU/EEA)",
              "gov.br/anpd or local SA",
            ],
          ]}
        />
        <P>
          We will respond to all legitimate requests within{" "}
          <strong className="text-surface-dark">15 business days</strong>. We may ask
          you to verify your identity before fulfilling a request. There is no
          charge for exercising these rights, although we may charge a reasonable
          administrative fee for manifestly unfounded or excessive requests.
        </P>
      </>
    ),
  },
  {
    id: "retention",
    title: "12. Data Retention",
    content: (
      <>
        <P>
          We retain personal data only for as long as necessary for the stated
          purpose or as required by law:
        </P>
        <Table
          headers={["Data Category", "Retention Period", "Basis"]}
          rows={[
            [
              "Resident case records",
              "5 years post-case closure (minimum)",
              "LOAS regulatory requirement",
            ],
            ["Process recordings", "3 years post-case closure", "Operational; consent"],
            ["Donor financial records", "10 years", "Brazilian tax law (Lei 9.430/1996)"],
            ["Donor marketing preferences", "Until consent withdrawn", "Consent"],
            ["Website analytics (cookied)", "Up to 2 years", "Consent; legitimate interest"],
            ["Employee records", "5 years post-employment", "Labour law (CLT)"],
          ]}
        />
        <P>
          Upon expiry of the applicable retention period, data is securely deleted
          using NIST 800-88 guidelines or physically destroyed where applicable.
        </P>
      </>
    ),
  },
  {
    id: "children",
    title: "13. Children's Data",
    content: (
      <>
        <P>
          Nova Path frequently serves families with minors. Data relating to
          individuals under the age of 18 is treated as requiring heightened
          protection:
        </P>
        <UL
          items={[
            "Consent for processing is obtained from a parent or legal guardian",
            "Minors' data is pseudonymised in case management systems wherever possible",
            "Our website does not knowingly collect personal data from children under 13 through public-facing forms",
            "If we discover we have inadvertently collected such data without appropriate authorisation, we will delete it promptly",
          ]}
        />
      </>
    ),
  },
  {
    id: "changes",
    title: "14. Changes to This Policy",
    content: (
      <>
        <P>
          We may update this Privacy Policy from time to time to reflect changes
          in our practices, technology, legal requirements, or other factors. We
          will post the updated Policy on this page with a revised{" "}
          <strong className="text-surface-dark">Last Updated</strong> date.
        </P>
        <P>
          For material changes, we will notify registered donors by email and
          display a prominent notice on our website at least{" "}
          <strong className="text-surface-dark">30 days</strong> before the change takes
          effect. Continued use of our services after that date constitutes
          acceptance of the revised Policy.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "15. Contact Us",
    content: (
      <>
        <P>
          For any questions, concerns, or requests relating to this Privacy
          Policy or the processing of your personal data, please contact us:
        </P>
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-5 py-4 space-y-2 text-[14px]">
          <p className="text-surface-dark font-semibold">Nova Path - Associacao Nova Path</p>
          <p className="text-surface-text">{ORG_ADDRESS}</p>
          <a
            href={`mailto:${CONTROLLER_EMAIL}`}
            className="text-brand underline underline-offset-2 hover:text-brand-dark block"
          >
            {CONTROLLER_EMAIL}
          </a>
          <p className="text-surface-text">
            DPO direct line:{" "}
            <a
              href={`mailto:${DPO_EMAIL}`}
              className="text-brand underline underline-offset-2 hover:text-brand-dark"
            >
              {DPO_EMAIL}
            </a>
          </p>
        </div>
      </>
    ),
  },
];

function NavDot({
  section,
  active,
  onClick,
}: {
  section: Section;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        aria-label={`Jump to section: ${section.title}`}
        aria-current={active ? "true" : undefined}
        className="group flex items-center gap-3 w-full text-left focus-visible:outline-none"
      >
        <span
          className={`shrink-0 rounded-full transition-all duration-300 ${
            active
              ? "w-2.5 h-2.5 bg-accent"
              : "w-1.5 h-1.5 bg-brand-100 group-hover:bg-brand"
          }`}
        />
        <span
          className={`text-[12px] leading-snug transition-colors duration-200 hidden xl:block ${
            active ? "text-accent font-medium" : "text-surface-text group-hover:text-surface-dark"
          }`}
        >
          {section.title.replace(/^\d+\.\s/, "")}
        </span>
      </button>
    </li>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      id={section.id}
      aria-labelledby={`heading-${section.id}`}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-24"
    >
      <h2
        id={`heading-${section.id}`}
        className="font-display font-bold text-2xl text-surface-dark mb-6 pb-4 border-b border-brand-100 flex items-center gap-3"
      >
        <span
          aria-hidden="true"
          className="w-1 h-6 rounded-full shrink-0"
          style={{ background: "linear-gradient(180deg,var(--color-brand),var(--color-accent))" }}
        />
        {section.title}
      </h2>
      <div>{section.content}</div>
    </motion.section>
  );
}

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen text-surface-dark">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Sora', sans-serif; }
      `}</style>

      <header className="sticky top-0 z-30 border-b border-brand-100/40 bg-white/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 font-display font-bold text-base text-surface-text hover:text-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
            aria-label="Back to Nova Path home"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Nova Path
          </a>
          <span className="text-surface-text text-xs">
            Last updated: {LAST_UPDATED}
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 sm:px-6">
        <nav
          aria-label="Privacy policy sections"
          className="hidden lg:flex flex-col gap-1 w-56 xl:w-64 shrink-0 self-start sticky top-28"
        >
          <p className="text-[10px] uppercase tracking-widest text-surface-text font-semibold mb-3 px-1">
            Contents
          </p>
          <ul className="space-y-2.5" role="list">
            {sections.map((s) => (
              <NavDot
                key={s.id}
                section={s}
                active={activeSection === s.id}
                onClick={() => scrollTo(s.id)}
              />
            ))}
          </ul>
        </nav>

        <main className="flex-1 min-w-0" aria-label="Privacy Policy">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <p className="text-accent text-xs uppercase tracking-[0.2em] font-semibold mb-4 flex items-center gap-2">
              <span aria-hidden="true" className="w-6 h-px bg-accent/60" />
              Legal Document
            </p>
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl text-surface-dark leading-tight mb-5">
              Privacy{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(90deg,var(--color-brand),#60a5fa)",
                }}
              >
                Policy
              </span>
            </h1>
            <p className="text-surface-text text-base leading-relaxed max-w-2xl">
              Nova Path is committed to handling all personal data with
              transparency, care, and legal precision - especially the data of
              those who depend on us most. This policy explains what we collect,
              why, and how we protect it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {["LGPD Compliant", "GDPR Aware", "PCI-DSS Donors", "Zero Data Sales"].map(
                (badge) => (
                  <span
                    key={badge}
                    className="text-[11px] font-medium px-3 py-1 rounded-full border"
                    style={{
                      background: "color-mix(in srgb, var(--color-brand) 6%, transparent)",
                      borderColor: "color-mix(in srgb, var(--color-brand) 20%, transparent)",
                      color: "var(--color-accent-dark)",
                    }}
                  >
                    {badge}
                  </span>
                )
              )}
            </div>
          </motion.div>

          <div className="space-y-10">
            {sections.map((s) => (
              <SectionBlock key={s.id} section={s} />
            ))}
          </div>

          <div className="mt-20 pt-10 border-t border-brand-100 text-center">
            <p className="text-surface-text text-xs">
              Nova Path - Associacao Nova Path · CNPJ 00.000.000/0001-00 ·{" "}
              {ORG_ADDRESS}
            </p>
            <p className="text-surface-text text-xs mt-1">
              This document was last updated on {LAST_UPDATED}.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

