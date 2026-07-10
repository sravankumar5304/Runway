// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  skills: [],          // [{key, label}]
  questions: [],        // cached full question list
  activeCategory: 'all',
  activeQuestion: null
};

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel-view').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'interview' && state.questions.length === 0) {
      loadQuestions();
    }
  });
});

// ---------------------------------------------------------------------------
// Skills panel
// ---------------------------------------------------------------------------
function renderSkillChips() {
  const mount = document.getElementById('skill-chips');
  mount.innerHTML = '';
  if (state.skills.length === 0) {
    mount.innerHTML = '<span class="hint" style="margin:0;">No skills yet — extract from your resume above, or add one manually.</span>';
    return;
  }
  state.skills.forEach((s) => {
    const chip = document.createElement('span');
    chip.className = 'chip on';
    chip.innerHTML = `${s.label} <button title="Remove" data-key="${s.key}">&times;</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      state.skills = state.skills.filter((sk) => sk.key !== s.key);
      renderSkillChips();
    });
    mount.appendChild(chip);
  });
}

function addSkills(list) {
  list.forEach((s) => {
    if (!state.skills.some((existing) => existing.key === s.key)) {
      state.skills.push(s);
    }
  });
  renderSkillChips();
}

document.getElementById('extract-btn').addEventListener('click', async () => {
  const text = document.getElementById('resume-input').value.trim();
  if (!text) return;
  const btn = document.getElementById('extract-btn');
  btn.disabled = true;
  btn.textContent = 'Scanning...';
  try {
    const res = await fetch('/api/skills/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: text })
    });
    const data = await res.json();
    addSkills(data.skills);
  } catch (err) {
    alert('Could not reach the server. Is it running?');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Extract skills';
  }
});

document.getElementById('manual-skill-input').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const val = e.target.value.trim();
  if (!val) return;
  e.target.value = '';
  try {
    const res = await fetch('/api/skills/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: val })
    });
    const data = await res.json();
    if (data.skills.length > 0) {
      addSkills(data.skills);
    } else {
      const key = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      addSkills([{ key, label: val }]);
    }
  } catch (err) {
    // fall back to adding a raw chip if the server call fails
    const key = val.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    addSkills([{ key, label: val }]);
  }
});

// ---------------------------------------------------------------------------
// Job matches
// ---------------------------------------------------------------------------
function buildGauge(percent) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  const color = percent >= 70 ? 'var(--success)' : percent >= 40 ? 'var(--accent)' : 'var(--danger)';
  return `
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--hairline)" stroke-width="8"/>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
        transform="rotate(-90 40 40)"/>
      <text x="40" y="45" text-anchor="middle" font-family="IBM Plex Mono, monospace"
        font-size="16" fill="var(--text)">${percent}%</text>
    </svg>`;
}

function chipList(items, cls) {
  if (!items || items.length === 0) return '';
  return items.map((i) => `<span class="chip ${cls}">${i}</span>`).join('');
}

async function findMatches() {
  const mount = document.getElementById('job-results');
  mount.innerHTML = '<p class="empty-state">Calculating matches...</p>';
  try {
    const res = await fetch('/api/jobs/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: state.skills.map((s) => s.key) })
    });
    const data = await res.json();
    if (data.jobs.length === 0) {
      mount.innerHTML = '<p class="empty-state">No jobs to compare yet.</p>';
      return;
    }
    mount.innerHTML = data.jobs.map((job) => `
      <div class="job-card">
        <div class="gauge-wrap">${buildGauge(job.matchPercent)}</div>
        <div class="job-meta">
          <div class="job-title-row">
            <span class="job-title">${job.title}</span>
            <span class="level-tag">${job.level}</span>
          </div>
          <div class="job-sub">${job.company} · ${job.location}</div>
          <p class="job-desc">${job.description}</p>
          <div class="chip-row">
            ${chipList(job.matchedRequiredSkills, 'matched')}
            ${chipList(job.missingRequiredSkills, 'missing')}
            ${chipList(job.matchedNiceToHaveSkills, 'on')}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    mount.innerHTML = '<p class="empty-state">Could not reach the server.</p>';
  }
}

document.getElementById('match-btn').addEventListener('click', findMatches);

// ---------------------------------------------------------------------------
// Interview practice
// ---------------------------------------------------------------------------
async function loadQuestions() {
  const res = await fetch('/api/questions');
  const data = await res.json();
  state.questions = data.questions;
  renderQuestionList();
}

function renderQuestionList() {
  const mount = document.getElementById('question-list');
  const list = state.activeCategory === 'all'
    ? state.questions
    : state.questions.filter((q) => q.category === state.activeCategory);
  mount.innerHTML = '';
  list.forEach((q) => {
    const item = document.createElement('button');
    item.className = 'question-item' + (state.activeQuestion && state.activeQuestion.id === q.id ? ' active' : '');
    item.textContent = q.text;
    item.addEventListener('click', () => selectQuestion(q));
    mount.appendChild(item);
  });
}

document.querySelectorAll('.cat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderQuestionList();
  });
});

function selectQuestion(q) {
  state.activeQuestion = q;
  renderQuestionList();
  const detail = document.getElementById('question-detail');
  detail.innerHTML = `
    <h3 class="active-question">${q.text}</h3>
    <p class="tip-line">${q.tip}</p>
    <textarea id="answer-input" placeholder="Type the answer you'd say out loud..."></textarea>
    <button class="btn" id="submit-answer-btn">Get feedback</button>
  `;
  document.getElementById('feedback-mount').innerHTML = '';
  document.getElementById('submit-answer-btn').addEventListener('click', () => submitAnswer(q.id));
}

async function submitAnswer(questionId) {
  const answerText = document.getElementById('answer-input').value;
  const feedbackMount = document.getElementById('feedback-mount');
  feedbackMount.innerHTML = '<p class="empty-state">Evaluating answer...</p>';
  try {
    const res = await fetch('/api/interview/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answerText })
    });
    const data = await res.json();
    renderFeedback(data);
  } catch (err) {
    feedbackMount.innerHTML = '<p class="empty-state">Could not reach the server.</p>';
  }
}

function renderFeedback(data) {
  const mount = document.getElementById('feedback-mount');
  const entries = data.feedback.map((f) => `
    <div class="log-entry"><span class="marker">&gt;</span><span>${f}</span></div>
  `).join('');

  const kwChips = chipList(data.matchedKeywords, 'matched') + chipList(data.missingKeywords, 'missing');

  mount.innerHTML = `
    <div class="log-panel">
      <div class="log-header">
        <span class="grade">${data.grade}</span>
        <span class="score-dial">${data.score}<span style="font-size:13px;color:var(--text-muted)">/100</span></span>
      </div>
      <div class="log-body">
        ${entries}
        ${kwChips ? `<div class="chip-row" style="margin-top:14px;">${kwChips}</div>` : ''}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
renderSkillChips();
