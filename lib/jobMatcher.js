const fs = require('fs');
const path = require('path');
const { skillLabel } = require('./skillExtractor');

const jobs = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'jobs.json'), 'utf8')
);

// Required skills count double toward the match score; nice-to-have skills
// count once. This keeps the score interpretable while still rewarding
// candidates who cover the "must-have" bar for a role.
const REQUIRED_WEIGHT = 2;
const NICE_TO_HAVE_WEIGHT = 1;

function scoreJob(job, candidateSkills) {
  const candidateSet = new Set(candidateSkills);
  const required = job.required_skills || [];
  const niceToHave = job.nice_to_have_skills || [];

  const matchedRequired = required.filter((s) => candidateSet.has(s));
  const missingRequired = required.filter((s) => !candidateSet.has(s));
  const matchedNice = niceToHave.filter((s) => candidateSet.has(s));

  const maxPoints =
    required.length * REQUIRED_WEIGHT + niceToHave.length * NICE_TO_HAVE_WEIGHT;
  const earnedPoints =
    matchedRequired.length * REQUIRED_WEIGHT + matchedNice.length * NICE_TO_HAVE_WEIGHT;

  const matchPercent = maxPoints === 0 ? 0 : Math.round((earnedPoints / maxPoints) * 100);

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    level: job.level,
    description: job.description,
    matchPercent,
    matchedRequiredSkills: matchedRequired.map(skillLabel),
    missingRequiredSkills: missingRequired.map(skillLabel),
    matchedNiceToHaveSkills: matchedNice.map(skillLabel)
  };
}

/**
 * Rank all sample jobs against a candidate's extracted skill set.
 * @param {string[]} candidateSkills canonical skill keys
 * @returns {object[]} jobs sorted by descending match percentage
 */
function recommendJobs(candidateSkills) {
  return jobs
    .map((job) => scoreJob(job, candidateSkills))
    .sort((a, b) => b.matchPercent - a.matchPercent);
}

module.exports = { recommendJobs };
