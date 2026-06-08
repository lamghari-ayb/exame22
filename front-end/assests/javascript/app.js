
const API = 'http://localhost:3000/api';


let candidats = [];
let selectedCandidatId = null;



function showSection(name, btn) {
  // Désactiver toutes les sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Désactiver tous les boutons nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Activer la section demandée
  document.getElementById('section-' + name).classList.add('active');

  // Activer le bouton cliqué
  if (btn) btn.classList.add('active');

  // Charger les données selon la section
  if (name === 'resultats') {
    loadResultats();
  }
}


function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;

  
  setTimeout(() => toast.classList.add('show'), 10);

  
  setTimeout(() => toast.classList.remove('show'), 3500);
}


function openModal(candidatId, candidatNom) {
  selectedCandidatId = candidatId;

  
  document.getElementById('modal-text').innerHTML =
    `Vous vous apprêtez à voter pour <strong>${candidatNom}</strong>. Cette action est <strong>irréversible</strong>.`;

  
  document.getElementById('modal-overlay').classList.add('open');
}


function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  selectedCandidatId = null;

  
  document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
}


document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});


async function loadCandidats() {
  const grid = document.getElementById('cards-grid');

  try {
    const response = await fetch(`${API}/candidats`);
    candidats = await response.json();

    if (!candidats.length) {
      grid.innerHTML = '<div class="empty">Aucun candidat disponible.</div>';
      return;
    }

    
    grid.innerHTML = candidats.map(c => buildCandidateCard(c)).join('');

  } catch (error) {
    grid.innerHTML = `
      <div class="empty">
        ⚠️ Impossible de charger les candidats.<br>
        Vérifiez que le serveur est démarré sur le port 3000.
      </div>`;
  }
}


function buildCandidateCard(candidat) {
  const photo = candidat.photo || `https://i.pravatar.cc/300?img=${candidat.id}`;
  const nom   = candidat.nom.replace(/'/g, "\\'"); // échapper les apostrophes

  return `
    <div class="candidate-card" id="card-${candidat.id}">
      <img
        class="card-img"
        src="${photo}"
        alt="${candidat.nom}"
        loading="lazy"
      />
      <div class="card-body">
        <div class="card-name">${candidat.nom}</div>
        <div class="card-programme">${candidat.programme}</div>
        <button
          class="card-vote-btn"
          onclick="handleVoteClick(${candidat.id}, '${nom}')"
        >
          Voter pour ce candidat
        </button>
      </div>
    </div>
  `;
}


function handleVoteClick(candidatId, candidatNom) {
  const studentId = document.getElementById('student-id').value.trim();

  
  if (!studentId) {
    showToast('⚠️ Veuillez saisir votre identifiant étudiant.', 'error');
    document.getElementById('student-id').focus();
    return;
  }

  
  document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('card-' + candidatId)?.classList.add('selected');

  
  openModal(candidatId, candidatNom);
}


async function confirmVote() {
  const studentId = document.getElementById('student-id').value.trim();
  const candidatId = selectedCandidatId;

  
  closeModal();

  try {
    const response = await fetch(`${API}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etudiant_id: studentId,
        candidat_id: candidatId
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Succès
      showToast('✅ ' + data.message, 'success');
      document.getElementById('student-id').value = '';
    } else {
      // Erreur (ex: déjà voté)
      showToast('❌ ' + data.error, 'error');
    }

  } catch (error) {
    showToast('⚠️ Erreur réseau. Vérifiez que le serveur est démarré.', 'error');
  }
}


async function loadResultats() {
  const list = document.getElementById('results-list');
  list.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement des résultats…</div>';

  try {
    const response = await fetch(`${API}/resultats`);
    const data = await response.json();

    
    document.getElementById('total-votes').textContent = data.total_votes;

    if (!data.resultats.length) {
      list.innerHTML = '<div class="empty">Aucun vote enregistré pour le moment.</div>';
      return;
    }

    
    list.innerHTML = data.resultats
      .map((r, index) => buildResultItem(r, index, data.total_votes))
      .join('');

    
    setTimeout(() => {
      document.querySelectorAll('.result-bar').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    }, 100);

  } catch (error) {
    list.innerHTML = `
      <div class="empty">
        ⚠️ Impossible de charger les résultats.<br>
        Vérifiez que le serveur est démarré sur le port 3000.
      </div>`;
  }
}


function buildResultItem(resultat, index, totalVotes) {
  const medals     = ['🥇', '🥈', '🥉'];
  const rankClass  = ['first', 'second', 'third'];
  const rank       = medals[index]   || (index + 1);
  const cssClass   = rankClass[index] || '';
  const pct        = totalVotes > 0 ? Math.round((resultat.votes / totalVotes) * 100) : 0;
  const pctLabel   = totalVotes > 0 ? pct + '%' : '—';
  const photo      = resultat.photo || `https://i.pravatar.cc/100?img=${resultat.id}`;

  return `
    <div class="result-item" style="animation-delay: ${index * 0.08}s">
      <div class="result-rank ${cssClass}">${rank}</div>
      <img class="result-photo" src="${photo}" alt="${resultat.nom}" />
      <div class="result-info">
        <div class="result-name">${resultat.nom}</div>
        <div class="result-bar-wrap">
          <div class="result-bar" style="width: 0%" data-pct="${pct}"></div>
        </div>
      </div>
      <div class="result-stats">
        <div class="result-votes">${resultat.votes}</div>
        <div class="result-pct">${pctLabel}</div>
      </div>
    </div>
  `;
}


document.addEventListener('DOMContentLoaded', () => {
  loadCandidats();
});
