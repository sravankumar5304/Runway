const fs = require('fs');
const path = require('path');

const skillsMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'skills.json'), 'utf8')
);

// Escape regex special characters in a synonym before building a matcher.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract canonical skill keys found in a free-text resume/profile string.
 * Matching is case-insensitive and uses word boundaries so short synonyms
 * like "js" or "ml" don't match inside unrelated words.
 * @param {string} text
 * @returns {string[]} sorted list of canonical skill keys
 */
function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();
  const found = new Set();

  for (const [canonical, synonyms] of Object.entries(skillsMap)) {
    for (const syn of synonyms) {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(syn)}([^a-z0-9]|$)`, 'i');
      if (pattern.test(lower)) {
        found.add(canonical);
        break;
      }
    }
  }
  return Array.from(found).sort();
}

function allSkills() {
  return Object.keys(skillsMap);
}

const LABEL_OVERRIDES = {
  sql: 'SQL',
  nosql: 'NoSQL',
  html_css: 'HTML/CSS',
  ui_design: 'UI Design',
  ux_research: 'UX Research',
  api_design: 'API Design',
  ci_cd: 'CI/CD',
  seo: 'SEO',
  testing_qa: 'QA/Testing',
  cloud_aws: 'AWS',
  cloud_azure: 'Azure',
  cloud_gcp: 'Google Cloud',
  c_sharp: 'C#',
  node: 'Node.js'
};

function skillLabel(key) {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

module.exports = { extractSkills, allSkills, skillLabel };
