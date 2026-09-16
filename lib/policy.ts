export interface PolicyBlock {
  type: "paragraph" | "list";
  text?: string;
  items?: string[];
}

export interface PolicySection {
  number: string;
  title: string;
  blocks: PolicyBlock[];
}

export const POLICY_TITLE = "Terms & Privacy";
export const POLICY_UPDATED = "September 2026";

const RAW_POLICY = `1. About AU75

AU75 is an independent application designed to help students conveniently track and view their attendance information and related academic information.

AU75 may retrieve, process, display, or calculate information based on data available through the Alliance University ERP (AUERP) student portal.

AU75 is not affiliated with, endorsed by, sponsored by, or officially operated by Alliance University, unless explicitly stated otherwise.

The official Alliance University ERP may be accessed through the University's designated portal.

2. Accuracy of Information

AU75 attempts to display attendance and related information accurately based on the information available through the relevant ERP system.

However, AU75 does not guarantee that the information displayed in the application will always be:

Accurate
Complete
Current
Available
Error-free
Synchronized with the University's latest records

Attendance records may be delayed, changed, corrected, or updated by the University or its faculty.

The official records maintained by Alliance University and its ERP system shall take precedence over any information displayed by AU75.

Users are responsible for verifying important academic information through the official University systems.

3. No Responsibility for Loss or Mishaps

AU75 and its developers shall not be responsible or liable for any direct, indirect, incidental, consequential, academic, financial, or other loss, damage, inconvenience, or consequence arising from the use of, or reliance upon, the application.

This includes, but is not limited to:

Attendance shortages
Attendance discrepancies
Missed classes
Examination eligibility issues
Academic penalties
Missed examinations
Incorrect or delayed attendance information
ERP outages or technical failures
Login failures
Internet or network problems
Server downtime
Application errors or bugs
Data synchronization issues
Device-related problems
Any other academic or personal consequence resulting from the use of AU75

Users should always verify critical attendance and academic information through the official University systems.

4. Third-Party Websites and Applications

AU75 may provide references, links, integrations, or functionality related to third-party websites, services, or applications, including the Alliance University ERP.

AU75 does not control or guarantee the availability, accuracy, security, reliability, or functionality of any third-party service.

If you choose to use any third-party website, application, service, or platform, you do so at your own risk.

AU75 shall not be responsible for any loss, damage, account issue, data loss, security incident, or other consequence arising from your use of any third-party website, application, or service.

5. Official University Information

AU75 is intended as a convenience tool and should not be considered the official source of University information.

For matters relating to:

Attendance eligibility
Examination eligibility
Academic records
Timetables
Results
University policies
Academic requirements
Attendance corrections

users should rely on official communications and systems provided by Alliance University.

6. User Responsibility

Users are responsible for ensuring that the information they use to access AU75 and any connected services is accurate and belongs to them.

Users must not:

Attempt to access another person's account
Use another person's credentials without authorization
Attempt to bypass security measures
Attempt to interfere with the application's operation
Attempt to manipulate attendance or academic records
Use AU75 for unlawful purposes
Attempt to gain unauthorized access to University systems

Any misuse of the application or connected services may result in termination of access.

7. Account Credentials

Users are responsible for maintaining the confidentiality of their login credentials.

AU75 will not be responsible for any loss or damage resulting from the user's failure to protect their credentials, unauthorized access caused by the user, or sharing of credentials with another person.

Users should never share their University ERP username or password with anyone unless required through an official and trusted University process.

8. Application Availability

We attempt to keep AU75 available and functional; however, we do not guarantee uninterrupted or error-free operation.

The application may become temporarily unavailable due to:

Maintenance
Updates
Technical problems
Server issues
Internet connectivity
ERP changes
Third-party service interruptions
Security issues
Circumstances beyond our reasonable control

AU75 reserves the right to modify, suspend, restrict, or discontinue any feature of the application at any time.

9. Updates and Announcements

All official AU75 updates, announcements, feature changes, maintenance information, and other relevant information will be communicated through:

https://au75.in

Users are responsible for checking the AU75 website periodically for important announcements and changes.

10. Changes to These Terms

We reserve the right to modify or update these Terms and Conditions at any time.

Changes will be communicated through the AU75 website or application where appropriate.

Your continued use of AU75 after changes to these Terms and Conditions means that you accept the updated Terms.

11. Intellectual Property
University names, trademarks, logos, and other third-party intellectual property remain the property of their respective owners.

12. Limitation of Liability

To the maximum extent permitted by applicable law, AU75 and its developers shall not be liable for any loss, damage, claim, expense, or consequence arising from:

Use or inability to use AU75
Reliance on information displayed by AU75
Errors or inaccuracies in attendance information
Changes made to University ERP systems
Third-party services
Account or credential issues
Technical failures
Data interruptions
Unauthorized use resulting from the user's actions
Any academic or administrative decision made by the University

The user acknowledges that AU75 is provided as a convenience tool and that use of the application is at the user's own risk.

13. Indemnification

By using AU75, you agree, to the extent permitted by applicable law, to indemnify and hold harmless AU75 and its developers from claims, losses, liabilities, damages, costs, or expenses arising from your misuse of the application, violation of these Terms, unauthorized access, or violation of applicable laws or third-party rights.

14. Privacy

Your use of AU75 may involve the processing of information necessary to provide the application's functionality.

Any collection, storage, processing, or use of personal information will be governed by the AU75 Privacy Policy.

Users should review the Privacy Policy before using the application.

15. Governing Law

These Terms and Conditions shall be governed by and interpreted in accordance with the applicable laws of India.

Any disputes arising in connection with AU75 shall be subject to the jurisdiction of the appropriate courts in India, subject to applicable law.

16. Contact

For questions, concerns, bug reports, or other matters relating to AU75, users may refer to the official AU75 website:

https://au75.in

17. Acceptance of Terms

By downloading, accessing, or using AU75, you acknowledge that:

You have read and understood these Terms and Conditions.
You agree to comply with these Terms and Conditions.
You understand that AU75 is an independent convenience tool.
You understand that official University records take precedence over information displayed by AU75.
You understand that AU75 is not responsible for losses, academic consequences, or other mishaps resulting from the use of the application or third-party services.

If you do not agree with these Terms and Conditions, please discontinue use of AU75.`;

export function parsePolicyText(raw: string): PolicySection[] {
  const sections: PolicySection[] = [];
  let current: PolicySection | null = null;

  const blocks = raw
    .split(/\n{2,}/)
    .map((b) =>
      b
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0);

  for (const lines of blocks) {
    const headingMatch = lines[0].match(/^(\d+)\.\s+(.+)$/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = {
        number: headingMatch[1],
        title: headingMatch[2],
        blocks: [],
      };
      const rest = lines.slice(1);
      if (rest.length) current.blocks.push(makeBlock(rest));
      continue;
    }
    if (current) {
      current.blocks.push(makeBlock(lines));
    }
  }
  if (current) sections.push(current);
  return sections;
}

function makeBlock(lines: string[]): PolicyBlock {
  if (lines.length === 1) return { type: "paragraph", text: lines[0] };
  return { type: "list", items: lines };
}

export const POLICY_SECTIONS: PolicySection[] = parsePolicyText(RAW_POLICY);
