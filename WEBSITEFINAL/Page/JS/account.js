// account.js — small handler to toggle the account panel and handle sign out/manage actions
(function(){
    const toggle = document.getElementById('accountToggle');
    const panel = document.getElementById('accountPanel');
    const signOutBtn = document.getElementById('signOutBtn');
    const manageBtn = document.getElementById('manageAccountBtn');
    const panelUser = document.getElementById('accountPanelUser');

    if(!toggle || !panel) return;

    function updateUserInfo(){
        // Prefer local username if present (this is set at signup), then firebase displayName/email
        let username = localStorage.getItem('perlas_username');
        if(!username && window.firebase && firebase.auth){
            const u = firebase.auth().currentUser;
            if(u){
                username = u.displayName || u.email || (u.providerData && u.providerData[0] && u.providerData[0].email);
            }
        }
        if(!username){
            username = localStorage.getItem('perlas_email') || null;
        }
        if(username){
            panelUser.textContent = 'Signed in as ' + username;
        } else {
            panelUser.textContent = 'Not signed in';
        }
    }

    function openPanel(){
        panel.classList.add('open');
        panel.setAttribute('aria-hidden','false');
        toggle.setAttribute('aria-expanded','true');
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKeyDown);
    }
    function closePanel(){
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden','true');
        toggle.setAttribute('aria-expanded','false');
        document.removeEventListener('click', onDocClick);
        document.removeEventListener('keydown', onKeyDown);
    }

    function onDocClick(e){
        if(!panel.contains(e.target) && !toggle.contains(e.target)){
            closePanel();
        }
    }
    function onKeyDown(e){
        if(e.key === 'Escape') closePanel();
    }

    toggle.addEventListener('click', function(e){
        e.stopPropagation();
        const isOpen = panel.classList.contains('open');
        if(isOpen) closePanel(); else { updateUserInfo(); openPanel(); }
    });

    manageBtn && manageBtn.addEventListener('click', function(){
        // Go to a manage account page — create it if not present. We use ManageAccount.html as a convention.
        window.location.href = 'ManageAccount.html';
    });

    signOutBtn && signOutBtn.addEventListener('click', function(){
        // Sign out with firebase if available otherwise clear local fallback and go to login
        if(window.firebase && firebase.auth){
            firebase.auth().signOut().then(()=>{
                localStorage.removeItem('perlas_username');
                localStorage.removeItem('perlas_email');
                window.location.href = 'Login.html';
            }).catch(err=>{
                console.error('Sign out error', err);
                // fallback
                localStorage.removeItem('perlas_username');
                localStorage.removeItem('perlas_email');
                window.location.href = 'Login.html';
            });
        } else {
            localStorage.removeItem('perlas_username');
            localStorage.removeItem('perlas_email');
            // if you have your own session cookie, clear it here
            window.location.href = 'Login.html';
        }
    });

    // Initialize displayed user name on load
    updateUserInfo();
})();
