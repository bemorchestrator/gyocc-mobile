// In-app copies of GYOCC's public documents, shown natively so members never
// leave the app to read them. Keep in step with the website versions
// (frontend/src/app/privacy/page.tsx): when one changes, update the other and
// the `updated` date.

export type LegalBlock =
  | { kind: "p"; text: string; lead?: string }
  | { kind: "list"; items: string[] }
  | { kind: "sub"; text: string }
  | { kind: "facts"; items: Array<[label: string, value: string]> }
  | { kind: "contact"; items: Array<{ label: string; value: string; href?: string }> };

export type LegalSection = { heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  id: LegalDocumentId;
  title: string;
  /** Short label for lists and the top of the screen. */
  label: string;
  updated: string;
  /**
   * False until GYOCC's officers have read and approved the wording. While
   * false, the screen shows a visible "Draft" note so it can't ship unnoticed.
   */
  approved: boolean;
  intro: LegalBlock[];
  sections: LegalSection[];
};

export type LegalDocumentId = "privacy" | "terms";

const privacy: LegalDocument = {
  id: "privacy",
  title: "Privacy Policy",
  label: "Privacy and security",
  updated: "15 November 2026",
  approved: true,
  intro: [
    {
      kind: "p",
      text: "This explains how GYOCC Official handles member data and how the app's safeguards line up with the NIST Confidentiality, Integrity and Availability triad and the NIST Cybersecurity Framework functions: Identify, Protect, Detect, Respond and Recover.",
    },
    {
      kind: "p",
      text: "It describes how the app works today and our security approach. It is not a claim of formal NIST certification.",
    },
    {
      kind: "facts",
      items: [
        ["App", "GYOCC Official"],
        ["Audience", "Registered GYOCC members and authorized administrators"],
        ["Primary data use", "Membership, schedules, attendance, reminders, alerts and administrative operations"],
      ],
    },
  ],
  sections: [
    {
      heading: "Scope and app behavior",
      blocks: [
        {
          kind: "p",
          text: "GYOCC Official is a member portal for GYOCC operations. It is not a public social network, marketplace, or open registration system. It supports the day-to-day work members and authorized staff need for membership, rehearsals, events, attendance, notifications and administration.",
        },
        {
          kind: "list",
          items: [
            "Members sign in with email and password, Google, or Sign in with Apple (on iPhone).",
            "Members can delete their account at any time from Account → Delete account in this app.",
            "Members can view their profile, membership details, schedules, attendance history, reminders, alerts and earnings information.",
            "Members can RSVP, clock in, clock out where required, and submit attendance-related information for assigned activities.",
            "Administrators manage membership, rehearsals, gigs, events, roles, permissions, notifications, reports, equipment, expenses, lessons and stipends through authenticated tools.",
            "The app is intended for registered GYOCC members and authorized organization administrators, not for general public account creation.",
          ],
        },
      ],
    },
    {
      heading: "Data handled by the app",
      blocks: [
        {
          kind: "p",
          text: "GYOCC Official uses the information needed to run the member portal, support attendance, deliver reminders, and let authorized staff administer organization records.",
        },
        {
          kind: "list",
          items: [
            "Account identity, such as name, email address, profile photo, email verification status and sign-in session state. If you use Sign in with Apple and choose to hide your email, we only receive Apple's private relay address.",
            "Precise location, captured only at the moment you tap Clock in or Clock out, to confirm you are at the rehearsal, gig or event venue. The app does not track your location in the background or at any other time.",
            "Member profile details, such as section, rank, level, voice part or instrument, membership status, join date and optional phone number.",
            "Choir, orchestra and event activity data, including rehearsals, gigs, events, RSVP status, roles, venues, attendance, clock-in and clock-out times, lateness, early leave records and excuse review status.",
            "Member portal records, including attendance history, upcoming schedules, earnings or stipend summaries and reminder preferences.",
            "Notification data, including in-app notifications, read status, Expo push tokens, platform, device identifier and last-seen timestamps used to deliver alerts.",
            "Administrative and security records, including role assignments, permission checks, audit log entries, IP address, user agent and timestamps for sensitive admin or sign-in actions.",
          ],
        },
      ],
    },
    {
      heading: "NIST CIA triad alignment",
      blocks: [
        {
          kind: "p",
          text: "The CIA triad is used here as an organizing model for how the app protects member information, preserves operational records, and keeps essential member tools available.",
        },
        { kind: "sub", text: "Confidentiality" },
        { kind: "p", text: "Member information is intended for signed-in GYOCC users and authorized administrators only." },
        {
          kind: "list",
          items: [
            "The member portal requires a valid session before profile, schedule, notification and attendance data can be viewed.",
            "Administrative actions use role-based permissions, with super-admin access separated from regular permission checks.",
            "Notifications are scoped to the signed-in recipient, and push tokens are attached to a specific user account.",
            "Privacy preferences in the app control what member profile information may be shown in member views.",
          ],
        },
        { kind: "sub", text: "Integrity" },
        { kind: "p", text: "Attendance, membership and administrative records are structured to preserve accurate history." },
        {
          kind: "list",
          items: [
            "Attendance records are tied to one member and one activity, with statuses such as Pending, Present, Late, Completed, Excused, NoShow and Absent.",
            "Clock-in and clock-out records store scheduled times, call times, grace minutes, lateness and early-leave values.",
            "Excuse review status and admin notes are stored separately from member-submitted activity actions.",
            "Admin and sign-in actions are written to an append-only audit log that blocks changes.",
          ],
        },
        { kind: "sub", text: "Availability" },
        { kind: "p", text: "The app is designed so members can reach schedules, reminders and attendance tools when they need them." },
        {
          kind: "list",
          items: [
            "Upcoming rehearsals, gigs and events are delivered through the member portal and shown in the app.",
            "Realtime updates help devices refresh when relevant admin changes happen.",
            "Mobile sessions let members stay signed in across app launches.",
            "When service issues occur, the priority is restoring sign-in, schedule access, attendance actions and notification delivery.",
          ],
        },
      ],
    },
    {
      heading: "NIST Cybersecurity Framework alignment",
      blocks: [
        {
          kind: "p",
          text: "The NIST Cybersecurity Framework functions are used as a practical structure for describing how the app identifies data, protects access, supports detection, enables response and prioritizes recovery.",
        },
        { kind: "sub", text: "Identify" },
        { kind: "p", text: "GYOCC identifies the member, schedule, attendance, notification and administrative data the app needs to run the member portal." },
        { kind: "p", lead: "In the app: ", text: "members, attendance records, notifications, roles, permissions, sessions and audit logs are kept as separate records." },
        { kind: "sub", text: "Protect" },
        { kind: "p", text: "GYOCC protects access through sign-in, member-scoped data, role-based admin permissions, and limited use of device data for notifications." },
        { kind: "p", lead: "In the app: ", text: "protected server routes require a signed-in session, and admin routes can require specific permissions." },
        { kind: "sub", text: "Detect" },
        { kind: "p", text: "GYOCC keeps records that help administrators review sensitive access and changes." },
        { kind: "p", lead: "In the app: ", text: "admin and sign-in actions can be recorded with who, what, IP address, device and time." },
        { kind: "sub", text: "Respond" },
        { kind: "p", text: "When a privacy, access or data issue is reported, GYOCC can review the affected account, roles, member record, notifications and audit history." },
        { kind: "p", lead: "In the app: ", text: "roles can be revoked, sessions signed out, push tokens removed, and member records reviewed by authorized administrators." },
        { kind: "sub", text: "Recover" },
        { kind: "p", text: "GYOCC prioritizes restoring what members rely on most: sign-in, schedules, attendance, reminders and profile access." },
        { kind: "p", lead: "In the app: ", text: "operational data is kept in server records so recovery can focus on restoring the member portal and admin tools." },
      ],
    },
    {
      heading: "Service providers and sharing",
      blocks: [
        {
          kind: "p",
          text: "GYOCC does not sell member data, does not show ads, and does not track members across other companies' apps or websites. We use a small number of service providers only to run the app, and they may process data solely for that purpose:",
        },
        {
          kind: "list",
          items: [
            "Google and Apple, when you choose to sign in with them (they share your name and email with us).",
            "Expo, Apple Push Notification service and Firebase Cloud Messaging, to deliver reminders to your device.",
            "Google Maps, to show venue maps in the app.",
            "Our email provider, to send sign-in codes and account messages.",
            "Our hosting and file storage providers, which keep the app's data and profile photos.",
          ],
        },
        {
          kind: "p",
          text: "Inside GYOCC, member information is visible only to the member and to authorized administrators. We handle personal information in line with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).",
        },
      ],
    },
    {
      heading: "Your choices, retention and account deletion",
      blocks: [
        {
          kind: "p",
          text: "You can manage notification preferences, allow or deny location access in your phone's settings (location is only needed for clock-in and clock-out), sign out, and contact GYOCC when profile, membership or account details need correcting.",
        },
        {
          kind: "p",
          lead: "Deleting your account. ",
          text: "Go to Account → Delete account in this app, confirm it is you, and your account is deleted straight away. If you no longer have the app, email info@gyocc.org from your account's address. Deletion removes your login and linked Google or Apple sign-in, your profile details (phone, part, birthday, photo), devices and push tokens, inbox notifications, uploaded documents, and the GPS points saved at clock-in and clock-out.",
        },
        {
          kind: "p",
          text: "To keep the organization's attendance reports and financial books accurate, attendance times and payment records are kept but renamed to “Former member” with no name, email, phone or location attached. Audit entries keep only internal account numbers. Inbox notifications expire automatically after 90 days.",
        },
      ],
    },
    {
      heading: "Contact",
      blocks: [
        { kind: "p", text: "For privacy, account or access questions, contact GenSan Youth Orchestra and Choir Corporation." },
        {
          kind: "contact",
          items: [
            { label: "Email", value: "info@gyocc.org", href: "mailto:info@gyocc.org?subject=Privacy%20question" },
            { label: "Phone", value: "+63 908 409 1939", href: "tel:+639084091939" },
            { label: "Address", value: "Ground Floor, Jumabo Building, #23 Kadulasan Street, General Santos City, Philippines" },
          ],
        },
      ],
    },
  ],
};

// Written 15 Nov 2026 from how the app works today; approved by GYOCC the same day.
const terms: LegalDocument = {
  id: "terms",
  title: "Terms of Use",
  label: "Rules for using the app",
  updated: "15 November 2026",
  approved: true,
  intro: [
    {
      kind: "p",
      text: "These terms are an agreement between you and GenSan Youth Orchestra and Choir Corporation (“GYOCC”, “we”) about using the GYOCC Official app. By creating an account or using the app, you agree to them. If you do not agree, please do not use the app.",
    },
    {
      kind: "p",
      text: "How we handle your personal information is explained separately in our Privacy Policy, which is part of these terms.",
    },
  ],
  sections: [
    {
      heading: "Who can use the app",
      blocks: [
        {
          kind: "list",
          items: [
            "The app is for registered GYOCC members and staff authorized by GYOCC. New accounts are reviewed and may be declined.",
            "If you are under 18, you may use the app only with the permission of your parent or guardian, who agrees to these terms on your behalf.",
            "You must give true and current details, and keep your phone number and part up to date.",
          ],
        },
      ],
    },
    {
      heading: "Your account",
      blocks: [
        {
          kind: "list",
          items: [
            "Your account is personal. Do not share your password or let anyone else sign in as you.",
            "You are responsible for what happens in your account. Tell us straight away at info@gyocc.org if you think someone else has used it.",
            "You can delete your account at any time from Account → Delete account.",
          ],
        },
      ],
    },
    {
      heading: "RSVPs, clock-in and attendance",
      blocks: [
        {
          kind: "list",
          items: [
            "Answer “Going” or “Can't go” honestly and as early as you can, so conductors can plan.",
            "Clock in and out only for yourself, and only when you are really at the venue. The app checks your location at that moment to confirm it.",
            "Never clock in for someone else, fake your location, or try to get around the app's checks. This can lead to your attendance being corrected and to disciplinary action under GYOCC's rules.",
            "Attendance records may be reviewed and corrected by authorized staff. Choosing “Can't go” does not by itself excuse an absence; excuses follow GYOCC's attendance policy.",
          ],
        },
      ],
    },
    {
      heading: "Payouts, stipends and scholarships",
      blocks: [
        {
          kind: "p",
          text: "Amounts shown in the app (such as gig payouts, stipends or scholarship status) are for your information. The official figures are GYOCC's finance records, and payments follow GYOCC's policies. If something looks wrong, contact us before signing any acknowledgement.",
        },
      ],
    },
    {
      heading: "Acceptable use",
      blocks: [
        { kind: "p", text: "When using the app, you agree not to:" },
        {
          kind: "list",
          items: [
            "Access, or try to access, accounts, records or admin tools you are not allowed to use.",
            "Upload anything unlawful, offensive, or that you have no right to share, including someone else's photo as your profile picture.",
            "Copy, share or post other members' personal details or the group's schedules, venues or materials outside GYOCC without permission.",
            "Interfere with the app, overload it, or try to break its security.",
          ],
        },
      ],
    },
    {
      heading: "GYOCC content",
      blocks: [
        {
          kind: "p",
          text: "The app, its design, the GYOCC name and logo, and materials shared through it belong to GYOCC or its licensors. You may use them only for your GYOCC activities. You keep ownership of the profile photo you upload, and allow GYOCC to show it to members and staff inside the app.",
        },
      ],
    },
    {
      heading: "Suspending or closing accounts",
      blocks: [
        {
          kind: "p",
          text: "GYOCC may suspend or close an account that breaks these terms, puts others at risk, or belongs to someone who is no longer a member. Where reasonable, we will tell you why first.",
        },
      ],
    },
    {
      heading: "The service",
      blocks: [
        {
          kind: "list",
          items: [
            "We work to keep the app accurate and available, but it is provided “as is”. Schedules can change, and the app may sometimes be unavailable, for example during maintenance or when your phone has no signal or location access.",
            "Always follow official announcements from your conductor or section admin if they differ from the app.",
            "To the extent the law allows, GYOCC is not liable for indirect losses from using or being unable to use the app. Nothing in these terms limits rights you have under Philippine law that cannot be limited.",
          ],
        },
      ],
    },
    {
      heading: "Apple and Google",
      blocks: [
        {
          kind: "p",
          text: "These terms are between you and GYOCC, not Apple or Google. Apple and Google are not responsible for the app or its support. If you got the app from the App Store, Apple and its subsidiaries may enforce these terms as third-party beneficiaries, and the App Store's own terms of use also apply.",
        },
      ],
    },
    {
      heading: "Changes and governing law",
      blocks: [
        {
          kind: "p",
          text: "We may update these terms as the app changes. We will show the new date at the top and, for important changes, tell you in the app. Using the app after a change means you accept the new terms.",
        },
        {
          kind: "p",
          text: "These terms are governed by the laws of the Republic of the Philippines. Any dispute will be handled by the proper courts of General Santos City, unless the law says otherwise.",
        },
      ],
    },
    {
      heading: "Contact",
      blocks: [
        { kind: "p", text: "Questions about these terms? Contact GenSan Youth Orchestra and Choir Corporation." },
        {
          kind: "contact",
          items: [
            { label: "Email", value: "info@gyocc.org", href: "mailto:info@gyocc.org?subject=Terms%20of%20Use%20question" },
            { label: "Phone", value: "+63 908 409 1939", href: "tel:+639084091939" },
            { label: "Address", value: "Ground Floor, Jumabo Building, #23 Kadulasan Street, General Santos City, Philippines" },
          ],
        },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = { privacy, terms };
