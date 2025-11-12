/* Admin console script
   - Requires Page/JS/firebase-init.js to be loaded first (it exposes loadFirebase())
   - Provides announcement posting, player listing with activate/deactivate, and admin listing
*/
(function(){
  const $id = id => document.getElementById(id);
  const $sel = (q, ctx=document) => ctx.querySelector(q);

  // Tabs
  const tabAnn = $id('tabAnn');
  const tabPlayers = $id('tabPlayers');
  const tabAdmins = $id('tabAdmins');
  const announceSection = $id('announceSection');
  const playersSection = $id('playersSection');
  const adminsSection = $id('adminsSection');

  function showSection(section){
    // hide all then show one
    announceSection.classList.toggle('hidden', section !== 'ann');
    playersSection.classList.toggle('hidden', section !== 'players');
    adminsSection.classList.toggle('hidden', section !== 'admins');
    // update active tab styling
    [tabAnn, tabPlayers, tabAdmins].forEach(btn => btn.classList.remove('active'));
    if(section === 'ann') tabAnn.classList.add('active');
    if(section === 'players') tabPlayers.classList.add('active');
    if(section === 'admins') tabAdmins.classList.add('active');
  }

  tabAnn.addEventListener('click', ()=> showSection('ann'));
  tabPlayers.addEventListener('click', ()=> showSection('players'));
  tabAdmins.addEventListener('click', ()=> showSection('admins'));

  // Wait for firebase
  loadFirebase().then(() => {
    const db = firebase.database();
    const auth = firebase.auth();

    // Announcement
    const postBtn = $id('postAnnouncementBtn');
    const annText = $id('announcementText');
    const announceStatus = $id('announceStatus');
    const latestAnnouncement = $id('latestAnnouncement');
    const announceLinkWrap = $id('announceLink');
    const adminBadge = $id('adminBadge');

    let isAdmin = false;
    function updateAdminUI(){
      if(postBtn) postBtn.disabled = !isAdmin;
      if(adminBadge) adminBadge.textContent = isAdmin ? '(admin)' : '(not admin)';
    }

    function loadLatestAnnouncement(){
      db.ref('announcements/latest').on('value', snap => {
        const v = snap.val();
        if(!v) {
          latestAnnouncement.textContent = 'No announcement posted yet.'; return;
        }
        const when = v.postedAt ? new Date(v.postedAt).toLocaleString() : '';
        latestAnnouncement.innerHTML = `<div class="announce-title">${escapeHtml(v.text)}</div><div class="announce-meta">Posted: ${when} by ${escapeHtml(v.postedBy||'system')}</div>`;
        if(announceLinkWrap && v.id){
          announceLinkWrap.innerHTML = '';
          const a = document.createElement('a');
          a.href = `Announcement.html?id=${encodeURIComponent(v.id)}`;
          a.target = '_blank';
          a.textContent = 'View public announcement';
          announceLinkWrap.appendChild(a);
        }
      });
    }

    postBtn.addEventListener('click', async ()=>{
      const text = annText.value.trim();
      if(!text) { alert('Announcement cannot be empty'); return; }
      const user = auth.currentUser;
      const postedBy = user ? (user.email || user.uid) : 'console';
      announceStatus.style.display = 'inline'; announceStatus.textContent = 'Posting...';
      try{
        // push into announcements/list for historical record
        const newRef = await db.ref('announcements/list').push({ text, postedAt: Date.now(), postedBy });
        const key = newRef.key;
        // set latest to a convenient copy (keeps backwards compatibility)
        const latestObj = { id: key, text, postedAt: Date.now(), postedBy };
        await db.ref('announcements/latest').set(latestObj);

        // show posted status and provide a link to public announcement page
        announceStatus.textContent = 'Posted';
        if(announceLinkWrap){
          announceLinkWrap.innerHTML = '';
          const a = document.createElement('a');
          a.href = `Announcement.html?id=${encodeURIComponent(key)}`;
          a.target = '_blank';
          a.textContent = 'View public announcement';
          announceLinkWrap.appendChild(a);
        }
        latestAnnouncement.innerHTML = `<div class="announce-title">${escapeHtml(text)}</div><div class="announce-meta">Posted: ${new Date().toLocaleString()} by ${escapeHtml(postedBy)}</div>`;
        setTimeout(()=> announceStatus.style.display='none', 2000);
      }catch(err){
        announceStatus.style.display='inline'; announceStatus.textContent = 'Error';
        console.error('Failed to post announcement', err);
      }
    });

    loadLatestAnnouncement();

    // helper: read ?view= and ?ann= params to show specific section on load and display context
    function qs(name){ const p = new URLSearchParams(location.search); return p.get(name); }
    const initialView = qs('view');
    const annParam = qs('ann');
    if(annParam){
      // show context banner with link back to announcement
      const banner = $id('adminContextBanner');
      const text = $id('adminContextText');
      if(banner && text){
        text.innerHTML = `Announcement: <a href="Announcement.html?id=${encodeURIComponent(annParam)}" target="_blank">${escapeHtml(annParam)}</a>`;
        banner.classList.add('visible');
      }
    }
    if(initialView === 'players' || initialView === 'ann' || initialView === 'admins'){
      showSection(initialView);
    } else {
      showSection('ann');
    }

    // Players listing
  const playersTbody = $sel('#playersTable tbody');

    function renderPlayers(snapshot){
      const data = snapshot.val() || {};
      playersTbody.innerHTML = '';
      Object.keys(data).forEach(uid => {
        const u = data[uid] || {};
        // Consider someone a player if they have a username/email or any gameplay stat
        const hasAccount = !!(u.username || u.email || u.displayName);
        const gameplayCandidates = ['totalCaught','totalFishCaught','fishCaught','score','played','playSessions','gamesPlayed','lastPlayed'];
        const played = gameplayCandidates.some(k => { return typeof u[k] === 'number' && u[k] > 0; }) || Object.keys(u).some(k => k.startsWith('caught') || k.startsWith('fish'));
        if(!hasAccount && !played) return; // skip non-players

        const tr = document.createElement('tr');
        const username = u.username || u.displayName || '';
        const email = u.email || '';
        const aqua = (typeof u.aquaGem === 'number') ? u.aquaGem : (u.aquaGem ? Number(u.aquaGem) : 0);

        // determine last active timestamp from multiple candidate fields
        const lastCandidates = ['lastActive','lastLogin','lastSeen','lastPlayed','updatedAt','lastSignInTime','lastOnline'];
        let last = null;
        for(const k of lastCandidates){ if(u[k]) { last = Number(u[k]); break; } }
        // if still not found, check nested stats
        if(!last && u.stats && typeof u.stats === 'object'){
          const keys = Object.keys(u.stats);
          for(const k of keys){ const v = u.stats[k]; if(k.toLowerCase().includes('last') && v) { last = Number(v); break; } }
        }

        const lastText = last ? new Date(last).toLocaleString() : 'unknown';
        const within7 = last ? (Date.now() - last) <= (7*24*60*60*1000) : false;
        const activeFlag = ('active' in u) ? !!u.active : true;

        tr.innerHTML = `
          <td>${escapeHtml(uid)}</td>
          <td>${escapeHtml(username)}</td>
          <td>${escapeHtml(email)}</td>
          <td>${escapeHtml(String(aqua))}</td>
          <td>${escapeHtml(lastText)}</td>
          <td>${within7 ? 'Active (7d)' : 'Inactive (7d)'}</td>
          <td class="admin-controls">
            <button class="block-btn">${activeFlag ? 'Block' : 'Unblock'}</button>
            <button class="delete-btn">Delete</button>
          </td>
        `;

        const blockBtn = tr.querySelector('.block-btn');
        blockBtn.disabled = !isAdmin;
        deleteBtn.disabled = !isAdmin;
        blockBtn.addEventListener('click', async ()=>{
          if(!isAdmin){ alert('Only admins can perform this action'); return; }
          const newState = !activeFlag;
          blockBtn.disabled = true; blockBtn.textContent = newState ? 'Unblocking...' : 'Blocking...';
          try{
            await db.ref(`users/${uid}/active`).set(newState);
            blockBtn.textContent = newState ? 'Block' : 'Unblock';
            tr.children[5].textContent = newState ? 'Active (7d)' : 'Inactive (7d)';
          }catch(err){ console.error(err); alert('Failed to change block state'); }
          finally{ blockBtn.disabled = false; }
        });

        const deleteBtn = tr.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async ()=>{
          if(!isAdmin){ alert('Only admins can perform this action'); return; }
          if(!confirm('Delete this user record? This cannot be undone from the client.')) return;
          deleteBtn.disabled = true; deleteBtn.textContent = 'Deleting...';
          try{
            await db.ref(`users/${uid}`).remove();
            tr.remove();
          }catch(err){ console.error(err); alert('Failed to delete'); deleteBtn.disabled = false; deleteBtn.textContent='Delete'; }
        });

        playersTbody.appendChild(tr);
      });
    }

    // subscribe to users
    db.ref('users').on('value', renderPlayers);

    // Admins listing
    const adminsList = $id('adminsList');
    function renderAdmins(snapshot){
      const data = snapshot.val() || {};
      adminsList.innerHTML = '';
      Object.keys(data).forEach(uid => {
        const u = data[uid] || {};
        const email = (u.email||'').toLowerCase();
        if(email.includes('@perlas.admin')){
          const div = document.createElement('div');
          div.className = 'admin-item';
          div.innerHTML = `<strong>${escapeHtml(u.username||u.displayName||email||uid)}</strong><div class="admin-email">${escapeHtml(u.email||'')}</div>`;
          adminsList.appendChild(div);
        }
      });
      if(!adminsList.children.length) adminsList.textContent = 'No admin users found.';
    }

    db.ref('users').on('value', renderAdmins);

    // small utility
    function escapeHtml(str){
      if(!str) return '';
      return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s]);
    }

    // show authorization hint and update UI
    auth.onAuthStateChanged(user => {
      if(user){
        const email = (user.email||'').toLowerCase();
        isAdmin = email.includes('@perlas.admin');
        if(!isAdmin){
          console.warn('Signed in user is not a perlas.admin, actions will still write to DB if allowed.');
        }
        updateAdminUI();
      } else {
        isAdmin = false; updateAdminUI();
      }
    });

  }).catch(err => console.error('Failed to load firebase', err));

})();
