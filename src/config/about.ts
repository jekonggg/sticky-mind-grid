/**
 * =====================================================================
 * SYSTEM OWNER & ATTRIBUTION CONFIGURATION
 * =====================================================================
 * Edit this file to update your personal details, system ownership,
 * professional links, and intellectual property information shown
 * in the Settings -> System & About tab.
 */

export interface SystemOwnerInfo {
  /** Your full name or alias */
  name: string;
  /** Monogram / Initials for the avatar badge (1-3 letters, e.g., "JD") */
  initials: string;
  /** Your professional title / role in the project */
  role: string;
  /** Badge label shown next to your name (e.g., "Author & Owner") */
  badge: string;
  /** Short statement describing your authorship / ownership */
  bio: string;
  /** Optional custom avatar image URL. Leave empty ("") to show the monogram initials */
  avatarUrl?: string;
  /** Copyright notice shown on the footer */
  copyright: string;
  /** License or ownership status (e.g. "Proprietary / All Rights Reserved", "MIT License") */
  license?: string;
  /** Verifiable professional links (leave empty string or undefined if not applicable) */
  links: {
    github?: string;
    linkedin?: string;
    website?: string;
    email?: string;
    facebook?: string;
  };
  /** Project metadata */
  project: {
    name: string;
    tagline: string;
    releaseYear: string;
  };
}

export const SYSTEM_OWNER: SystemOwnerInfo = {
  // 1. Personal Identity
  name: "John Christian C. Ramos",
  initials: "JC",
  role: "Creator & Lead Software Architect",
  badge: "Author & Owner",
  avatarUrl: "https://github.com/jekonggg.png", // e.g. "

  // 2. Authorship & Ownership Statement
  bio: "Sticky Mind Grid was designed, architected, and engineered from the ground up as a modern, real-time visual collaboration workspace. All proprietary codebases, design architectures, and core implementations belong to the author.",

  // 3. Legal Attribution
  copyright: `© ${new Date().getFullYear()} John Christian C. Ramos. All rights reserved.`,
  license: "Proprietary / All Rights Reserved",

  // 4. Verifiable Links (Set to empty string "" to hide any link)
  links: {
    github: "https://github.com/jekonggg",
    linkedin: "https://www.linkedin.com/in/john-christian-ramos-61552a351/",
    website: "https://jeysi.netlify.app",
    email: "johnchristianc.ramos@gmail.com",
    facebook: "", // e.g. "https://facebook.com/your-profile"
  },

  // 5. Project Metadata
  project: {
    name: "Sticky Mind Grid",
    tagline: "Collaborative Visual Task Management Platform",
    releaseYear: "2026",
  },
};
