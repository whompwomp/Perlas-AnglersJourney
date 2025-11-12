// gallery.js - simple infinite horizontal scroller with buttons
(function(){
  const track = document.querySelector('.gallery-track');
  if(!track) return;

  let items = Array.from(track.children);
  let itemCount = items.length;
  let itemWidth = items[0] ? (items[0].getBoundingClientRect().width + (parseInt(getComputedStyle(track).gap) || 16)) : 300;

  // clone items to each side to allow smooth infinite scroll
  function cloneForInfinite(){
    // clear clones first
    const clones = track.querySelectorAll('.clone');
    clones.forEach(c => c.remove());

    // recalc items (originals) in case DOM changed
    items = Array.from(track.children).filter(n => !n.classList.contains('clone'));
    itemCount = items.length;

    // append clones at end
    items.forEach(node => {
      const c = node.cloneNode(true);
      c.classList.add('clone');
      track.appendChild(c);
    });
    // prepend clones at start (reverse to keep order)
    for(let i = items.length -1; i >=0; i--){
      const c = items[i].cloneNode(true);
      c.classList.add('clone');
      track.insertBefore(c, track.firstChild);
    }
  }

  function init(){
    cloneForInfinite();
    // move scroll to the original items start (middle)
    // compute updated itemWidth and initial offset
    const first = track.querySelector('.gallery-item');
    const gap = parseInt(getComputedStyle(track).gap) || 20;
    itemWidth = first ? Math.round(first.getBoundingClientRect().width + gap) : itemWidth;

    // set scroll to the start of original items (after the prepended clones)
    const clonesWidth = itemWidth * itemCount; // total width of prepended clones
    track.scrollLeft = clonesWidth;
    track.classList.add('scrolling');
  }

  // animate auto scroll
  let rafId;
  let speed = 0.35; // pixels per frame
  function step(){
    track.scrollLeft += speed;
    // loop using clones
    const maxScroll = track.scrollWidth - track.clientWidth;
    if(track.scrollLeft >= maxScroll - 1){
      // jump back by the width of one clone set
      track.scrollLeft = track.scrollLeft - (itemWidth * itemCount);
    } else if(track.scrollLeft <= 1){
      track.scrollLeft = track.scrollLeft + (itemWidth * itemCount);
    }
    rafId = requestAnimationFrame(step);
  }

  // pause on hover
  track.addEventListener('mouseenter', ()=> { cancelAnimationFrame(rafId); });
  track.addEventListener('mouseleave', ()=> { rafId = requestAnimationFrame(step); });

  // drag-to-scroll (pointer events)
  let isDown = false;
  let startX;
  let scrollStart;
  let moved = false;

  track.addEventListener('pointerdown', (e) => {
    isDown = true;
    moved = false;
    track.setPointerCapture(e.pointerId);
    startX = e.clientX;
    scrollStart = track.scrollLeft;
    cancelAnimationFrame(rafId); // pause auto-scroll
    track.classList.add('grabbing');
  });

  track.addEventListener('pointermove', (e) => {
    if(!isDown) return;
    const dx = e.clientX - startX;
    if(Math.abs(dx) > 5) moved = true;
    track.scrollLeft = scrollStart - dx;
    // update active while dragging
    updateActive();
  });

  function endDrag(e){
    if(!isDown) return;
    isDown = false;
    try{ track.releasePointerCapture(e.pointerId); }catch(_){ }
    track.classList.remove('grabbing');
    // briefly pause then resume auto-scroll
    pauseAutoScroll();
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('pointerleave', endDrag);

  // suppress click if it was a drag
  track.addEventListener('click', (e)=>{
    if(moved) e.preventDefault();
  }, true);

  // helper: update active centered item
  let ticking = false;
  function updateActive(){
    const children = Array.from(track.querySelectorAll('.gallery-item'));
    if(children.length === 0) return;
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let nearest = null;
    let nearestDiff = Infinity;
    children.forEach(c => {
      const r = c.getBoundingClientRect();
      const cCenter = r.left + r.width / 2;
      const diff = Math.abs(cCenter - trackCenter);
      if(diff < nearestDiff){ nearestDiff = diff; nearest = c; }
      c.classList.remove('active');
    });
    if(nearest) nearest.classList.add('active');
  }

  // throttle scroll events
  track.addEventListener('scroll', ()=>{
    if(!ticking){
      window.requestAnimationFrame(()=>{ updateActive(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  function scrollByOne(direction = 1){
    // find width of one item (approx)
    const first = track.querySelector('.gallery-item');
    if(!first) return;
    const gap = parseInt(getComputedStyle(track).gap) || 20;
    const width = Math.round(first.getBoundingClientRect().width + gap);
    // smooth scroll
    track.scrollBy({ left: width * direction, behavior: 'smooth' });
    // pause auto-scroll briefly
    pauseAutoScroll();
  }

  let pauseTimeout;
  function pauseAutoScroll(){
    cancelAnimationFrame(rafId);
    clearTimeout(pauseTimeout);
    pauseTimeout = setTimeout(()=>{ rafId = requestAnimationFrame(step); }, 1500);
  }

  // buttons removed — UI is draggable only; scrollByOne remains available if needed programmatically

  // setup and start
  window.addEventListener('load', ()=>{
    init();
    rafId = requestAnimationFrame(step);
    // set initial active item
    setTimeout(updateActive, 80);
  });

  // also resize observer to recalc sizes
  window.addEventListener('resize', ()=>{
    // re-init clones to recalc widths
    cloneForInfinite();
    init();
  });

})();
