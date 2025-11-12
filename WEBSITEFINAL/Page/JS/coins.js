(function(){
    // coins.js - manage aquaGem counter and top-up panel
    const COIN_KEY = 'perlas_aquaGem';

    function $(id){ return document.getElementById(id); }

    function formatNumber(n){ return Intl.NumberFormat().format(n); }

    // package definitions: {pricePHP, gems}
    const PACKAGES = [
        { id: 'p1', price: 50, gems: 100, img: 'Page/images/topup1.svg' },
        { id: 'p2', price: 100, gems: 200, img: 'Page/images/topup2.svg' },
        { id: 'p3', price: 150, gems: 500, img: 'Page/images/topup3.svg' }
    ];

    // payment methods
    const PAYMENTS = [
        { id: 'gcash', name: 'GCash', img: 'Page/images/gcash.svg' },
        { id: 'paymaya', name: 'PayMaya', img: 'Page/images/paymaya.svg' },
        { id: 'card', name: 'Credit Card', img: 'Page/images/card.svg' }
    ];

    function readLocal(){
        const v = localStorage.getItem(COIN_KEY);
        return v ? parseInt(v,10) : 0;
    }
    function writeLocal(v){ localStorage.setItem(COIN_KEY, String(v)); }

    function showValue(n){
        const el = $('coinTotal');
        if(!el) return;
        el.textContent = formatNumber(n);
    }

    let previousFocus = null;
    function openPanel(){
        const panelWrap = $('topupPanelWrap');
        const btn = $('coinTopupBtn');
        const panel = $('topupPanel');
        if(!panelWrap || !btn || !panel) return;
        panelWrap.classList.add('open');
        btn.setAttribute('aria-expanded','true');
        // position the panel near the button
        positionPanel(btn, panel);
        // focus management
        previousFocus = document.activeElement;
        // focus first focusable inside panel
        const first = panel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if(first) first.focus();
        // trap focus
        document.addEventListener('keydown', onKeyDownPanel);
    }
    function closePanel(){
        const panelWrap = $('topupPanelWrap');
        const btn = $('coinTopupBtn');
        const wrapper = $('topupPanel');
        if(!panelWrap) return;
        panelWrap.classList.remove('open');
        if(btn) btn.setAttribute('aria-expanded','false');
        // reset flip
        if(wrapper) wrapper.classList.remove('flipped');
        // clear any inline sizing/positioning applied when opened
        if(wrapper){
            const card = wrapper.querySelector('.card');
            if(card) card.style.height = '';
            wrapper.style.maxHeight = '';
            wrapper.style.left = '';
            wrapper.style.top = '';
            wrapper.style.position = '';
            wrapper.classList.remove('fullscreen');
        }
        // remove focus trap
        document.removeEventListener('keydown', onKeyDownPanel);
        // restore focus
        if(previousFocus && previousFocus.focus) previousFocus.focus();
        previousFocus = null;
    }

    function initPanel(){
        const panel = $('topupPanel');
        if(!panel) return;
        const front = panel.querySelector('.topup-front');
        const back = panel.querySelector('.topup-back');

        // populate options on front
        const opts = front.querySelector('.topup-options');
        PACKAGES.forEach(p => {
            const card = document.createElement('div');
            card.className = 'topup-option';
            card.setAttribute('data-id', p.id);
            card.innerHTML = `
                <img src="${p.img}" alt="${p.gems} AquaGem">
                <div class="qty">${p.gems} AquaGem</div>
                <div class="price">₱${p.price}</div>
            `;
            card.addEventListener('click', ()=> selectPackage(p));
            // ensure layout recalculates when images load
            const img = card.querySelector('img');
            if(img){ img.addEventListener('load', ()=> {
                const btn = $('coinTopupBtn');
                requestAnimationFrame(()=> positionPanel(btn, panel));
            }); }
            opts.appendChild(card);
        });

        // populate payment list on back
        const payList = back.querySelector('.payment-list');
        PAYMENTS.forEach(pm => {
            const node = document.createElement('div');
            node.className = 'payment-method';
            node.setAttribute('data-id', pm.id);
            node.innerHTML = `<img src="${pm.img}" alt="${pm.name}"><div class="method-name">${pm.name}</div>`;
            node.addEventListener('click', ()=> confirmPayment(pm));
            // reposition when payment method images finish loading
            const pimg = node.querySelector('img');
            if(pimg){ pimg.addEventListener('load', ()=> {
                const btn = $('coinTopupBtn');
                requestAnimationFrame(()=> positionPanel(btn, panel));
            }); }
            payList.appendChild(node);
        });

        // close on outside click
        document.addEventListener('click', (e)=>{
            const wrap = $('topupPanelWrap');
            const btn = $('coinTopupBtn');
            if(!wrap) return;
            if(wrap.classList.contains('open')){
                if(!wrap.contains(e.target) && btn && !btn.contains(e.target)){
                    closePanel();
                }
            }
        });

        // topup close button
        const closeBtn = panel.querySelector('.close-topup');
        closeBtn && closeBtn.addEventListener('click', closePanel);
        // Next button on front - proceeds to payment methods if a package is selected
        const nextBtn = panel.querySelector('.topup-next');
        nextBtn && nextBtn.addEventListener('click', ()=>{
            if(!selectedPackage){
                // visual hint
                alert('Please select a package first');
                return;
            }
            panel.classList.add('flipped');
            const btn = $('coinTopupBtn');
            // reposition to ensure it still fits after flip
            requestAnimationFrame(()=> positionPanel(btn, panel));
        });
    }

    function onKeyDownPanel(e){
        if(e.key === 'Escape'){
            closePanel();
            return;
        }
        if(e.key === 'Tab'){
            // trap focus inside panel when open
            const panel = $('topupPanel');
            const wrap = $('topupPanelWrap');
            if(!wrap || !wrap.classList.contains('open') || !panel) return;
            const focusable = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if(!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length-1];
            if(e.shiftKey){
                if(document.activeElement === first){
                    e.preventDefault(); last.focus();
                }
            } else {
                if(document.activeElement === last){
                    e.preventDefault(); first.focus();
                }
            }
        }
    }

    function positionPanel(button, panel){
        if(!button || !panel) return;
        const rect = button.getBoundingClientRect();
        // calculate available space and set sensible maxHeight so panel fits fully in viewport
        const margin = 12; // margin from viewport edges
        const preferredMax = 520; // previously used max-height
        const availableBelow = Math.max(0, window.innerHeight - rect.bottom - margin);
        const availableAbove = Math.max(0, rect.top - margin);
        // choose the larger available space to set as maxHeight (but not exceeding preferredMax)
        const useMax = Math.min(preferredMax, Math.max(availableBelow, availableAbove, 200));
        // allow the panel's content to determine its needed height, then clamp
        const card = panel.querySelector('.card');
        const front = panel.querySelector('.topup-front');
        const back = panel.querySelector('.topup-back');

        // compute content height (both faces may differ); use scrollHeight to include overflowing children
        const contentHeight = Math.max(
            front ? front.scrollHeight : 0,
            back ? back.scrollHeight : 0
        );

        // clamp contentHeight to the useMax value so the panel won't grow beyond available space
        const desiredHeight = Math.min(contentHeight, useMax);
        // if we have a card element, set its inline height so the faces (which are absolutely positioned) cover children
        if(card){
            card.style.height = desiredHeight + 'px';
        }

        // measure the panel now that we've set the height
        panel.style.maxHeight = useMax + 'px';
        const pRect = panel.getBoundingClientRect();

        // Determine whether to place below or above to keep the panel fully visible
        let top;
        const fitsBelow = (availableBelow >= pRect.height);
        const fitsAbove = (availableAbove >= pRect.height);

        if(fitsBelow){
            // enough room below
            panel.classList.remove('fullscreen');
            top = rect.bottom + 8;
        } else if(fitsAbove){
            // enough room above
            panel.classList.remove('fullscreen');
            top = rect.top - pRect.height - 8;
        } else {
            // If it doesn't fit either side, switch to fullscreen modal so all contents are visible without internal scrolling
            panel.classList.add('fullscreen');
            // clear any inline height so fullscreen CSS can size content naturally
            if(card) card.style.height = '';
            panel.style.left = '';
            panel.style.top = '';
            panel.style.position = 'fixed';
            return;
        }

        // horizontal positioning: try to align right edge with button right edge, but clamp to viewport
        let left = rect.right - pRect.width;
        if(left < margin) left = margin;
        if(left + pRect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - pRect.width - margin);

        panel.style.position = 'fixed';
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    let selectedPackage = null;

    function selectPackage(pkg){
        selectedPackage = pkg;
        const panel = $('topupPanel');
        if(!panel) return;
        // show selected details in front footer and flip to payment side after user clicks NEXT
        const frontSelected = panel.querySelector('.front-selected');
        frontSelected.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img src="${pkg.img}" style="width:72px;height:48px;object-fit:cover;border-radius:6px"><div><div style="font-weight:700">${pkg.gems} AquaGem</div><div style="color:#0077a8">₱${pkg.price}</div></div></div>`;
        // re-position/recalculate heights after content change so the white card covers everything
        const btn = $('coinTopupBtn');
        // run in next frame to allow DOM updates to apply
        requestAnimationFrame(()=> positionPanel(btn, panel));
    }

    function confirmPayment(method){
        if(!selectedPackage){ alert('Select a package first'); return; }
        // Simulate payment flow: show a small processing state, then update DB
        const back = $('topupPanel').querySelector('.topup-back');
        back.innerHTML = `<div style="font-weight:700;color:#023047">Processing ${selectedPackage.gems} AquaGem via ${method.name}...</div>`;
        setTimeout(()=>{
            // update DB if firebase available
            if(window.firebase && firebase.auth && firebase.database){
                const u = firebase.auth().currentUser;
                if(u){
                    const uid = u.uid;
                    const ref = firebase.database().ref('users/' + uid + '/aquaGem');
                    ref.transaction(current => {
                        return (current || 0) + selectedPackage.gems;
                    }).then(()=>{
                        // reload displayed value
                        ref.once('value').then(snap=>{
                            const val = snap.val() || 0;
                            writeLocal(val);
                            showValue(val);
                            back.innerHTML = `<div style="font-weight:700;color:green">Top-up successful! +${selectedPackage.gems} AquaGem</div>`;
                            setTimeout(()=> closePanel(), 1200);
                        });
                    }).catch(err=>{
                        console.error('Top-up failed',err);
                        back.innerHTML = `<div style="color:red">Payment failed. Try again.</div>`;
                    });
                    return;
                }
            }
            // fallback: update localStorage
            const current = readLocal();
            const updated = current + selectedPackage.gems;
            writeLocal(updated);
            showValue(updated);
            back.innerHTML = `<div style="font-weight:700;color:green">Top-up successful! +${selectedPackage.gems} AquaGem</div>`;
            setTimeout(()=> closePanel(), 900);
        }, 1200);
    }

    // Listen to firebase DB changes and update display
    function bindFirebase(uid){
        if(!firebase || !firebase.database) return;
        const ref = firebase.database().ref('users/' + uid + '/aquaGem');
        ref.on('value', snap => {
            const v = snap.val() || 0;
            writeLocal(v);
            showValue(v);
        });
    }

    function init(){
        // Ensure DOM elements
        const coinEl = $('coinTotal');
        const topupBtn = $('coinTopupBtn');
        if(!coinEl || !topupBtn) return;

        // get initial value from firebase if possible
        if(window.firebase && firebase.auth){
            firebase.auth().onAuthStateChanged(user=>{
                if(user){
                    bindFirebase(user.uid);
                } else {
                    showValue(readLocal());
                }
            });
        } else {
            showValue(readLocal());
        }

        // wire open (click/keyboard)
        topupBtn.setAttribute('aria-expanded','false');
        topupBtn.addEventListener('click', (e)=>{
            e.stopPropagation();
            const wrap = $('topupPanelWrap');
            if(!wrap) return;
            if(wrap.classList.contains('open')) closePanel(); else openPanel();
            // reset flip
            const panel = $('topupPanel'); panel && panel.classList.remove('flipped');
        });
        topupBtn.addEventListener('keydown', (e)=>{
            if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); topupBtn.click(); }
        });

        // create panel DOM if not present and append to body to avoid clipping
        if(!$('topupPanelWrap')){
            const wrap = document.createElement('div');
            wrap.id = 'topupPanelWrap';
            wrap.className = '';
            wrap.innerHTML = `
                <div id="topupPanel" class="topup-panel" role="dialog" aria-modal="true">
                    <div class="card">
                        <div class="topup-front">
                            <div class="topup-title">Top-up AquaGem</div>
                            <div class="topup-options"></div>
                            <div class="front-selected" style="margin-top:8px"></div>
                            <div class="topup-footer"><button class="topup-btn primary topup-next">Next</button><button class="topup-btn ghost close-topup">Close</button></div>
                        </div>
                        <div class="topup-back">
                            <div class="topup-title">Choose payment method</div>
                            <div class="payment-list"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(wrap);
            initPanel();
        }

        // initialize panel content
        initPanel();
    }

    // run on DOM ready
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
