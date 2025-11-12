// leaderboard.js
// Reads users from Firebase Realtime Database and populates the leaderboard table.
(async function(){
    // small helper
    function escapeHtml(s){
        return String(s).replace(/[&<>"'`]/g, function(ch){
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;","`":"&#96;"})[ch];
        });
    }

    // candidate keys we will check for the "total caught" value
    const CANDIDATE_KEYS = ['totalCaught','fishCount','caught','fishCaught','fish_caught','total_fish','total_caught','caught_total','totalCaughtFish','total','fishTotal'];

    try{
        if (typeof loadFirebase !== 'function') {
            console.warn('loadFirebase() not present — ensure Page/JS/firebase-init.js is included before this script.');
        } else {
            await loadFirebase();
        }

        if (typeof firebase === 'undefined' || !firebase.database) {
            console.warn('Firebase not available after loadFirebase(). Leaderboard will not populate.');
            return;
        }

        const tbody = document.querySelector('.leaderboard-table tbody');
        if (!tbody) return;

        // read users once
        const snap = await firebase.database().ref('users').once('value');
        const users = snap.val() || {};

        const rows = [];

        for (const uid in users) {
            if (!Object.prototype.hasOwnProperty.call(users, uid)) continue;
            const u = users[uid] || {};

            const username = u.username || u.displayName || (u.email ? u.email.split('@')[0] : uid);

            // try candidate keys
            let total = null;
            for (const key of CANDIDATE_KEYS) {
                if (Object.prototype.hasOwnProperty.call(u, key)) {
                    const v = u[key];
                    if (typeof v === 'number') { total = v; break; }
                    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) { total = Number(v); break; }
                }
            }

            // check common nested shapes like stats: { totalCaught: 123 }
            if (total === null && u.stats && typeof u.stats === 'object') {
                for (const key of CANDIDATE_KEYS) {
                    if (Object.prototype.hasOwnProperty.call(u.stats, key)) {
                        const v = u.stats[key];
                        if (typeof v === 'number') { total = v; break; }
                        if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) { total = Number(v); break; }
                    }
                }
            }

            // last resort: search for any top-level numeric value > 0 (but prefer larger ones)
            if (total === null) {
                let best = 0;
                for (const k in u) {
                    const v = u[k];
                    if (typeof v === 'number' && v > best) best = v;
                }
                total = best || 0;
            }

            rows.push({ username: String(username || uid), total: Number(total || 0) });
        }

        // sort descending
        rows.sort((a,b) => b.total - a.total);

        // clear existing rows
        tbody.innerHTML = '';

        // If there are no players registered, leave the table empty (do not insert placeholder rows)
        if (rows.length === 0) {
            return;
        }

        // render rows with spacer rows for visual parity with the mockup
        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${escapeHtml(r.username)}</td><td>${escapeHtml(r.total)}</td>`;
            tbody.appendChild(tr);

            const spacer = document.createElement('tr');
            spacer.className = 'empty-row';
            spacer.innerHTML = '<td></td><td></td>';
            tbody.appendChild(spacer);
        });

    } catch (err) {
        console.error('Error populating leaderboard:', err);
    }

})();
