const express = require('express');
const fs = require('fs');
const path = require('path');

const { extractSkills, skillLabel } = require('./lib/skillExtractor');
const { recommendJobs } = require('./lib/jobMatcher');
const { evaluateAnswer } = require('./lib/answerFeedback');

const questions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf8')
);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Skills ---------------------------------------------------------------

app.post('/api/skills/extract', (req, res) => {
  const { resumeText } = req.body || {};
  const skills = extractSkills(resumeText);
  res.json({
    skills: skills.map((key) => ({ key, label: skillLabel(key) }))
  });
});

// --- Job recommendations ---------------------------------------------------

app.post('/api/jobs/recommend', (req, res) => {
  const { skills } = req.body || {};
  if (!Array.isArray(skills)) {
    return res.status(400).json({ error: 'skills must be an array of skill keys' });
  }
  const ranked = recommendJobs(skills);
  res.json({ jobs: ranked });
});

// --- Interview questions ----------------------------------------------------

app.get('/api/questions', (req, res) => {
  const { category } = req.query;
  const list = category
    ? questions.filter((q) => q.category === category)
    : questions;
  res.json({ questions: list });
});

app.get('/api/questions/:id', (req, res) => {
  const q = questions.find((item) => item.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  res.json({ question: q });
});

// --- Interview feedback ------------------------------------------------------

app.post('/api/interview/feedback', (req, res) => {
  const { questionId, answerText } = req.body || {};
  const question = questions.find((q) => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  const result = evaluateAnswer(question, answerText);
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Job-Seeking Assistance System running at http://localhost:${PORT}`);
});
