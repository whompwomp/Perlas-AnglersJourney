
// Animation for the content slide 
const boxes = document.querySelectorAll('.box');
window.addEventListener('scroll', checkBoxes);

checkBoxes();

function checkBoxes(){
    const triggerBottom = window.innerHeight / 5 * 4;

    boxes.forEach((box) => {
        const boxtop = box.getBoundingClientRect().top;
        if (boxtop < triggerBottom){
        box.classList.add('show');
        }else{
            box.classList.remove('show')
        }

    })
};
// For fade animation
let btn = document.querySelector('#btn');  
let sidebar = document.querySelector('.sidebar');

btn.onclick = function () {
    sidebar.classList.toggle('active');
};

// Header hide-on-scroll: hide when scrolling down, show when scrolling up
(function(){
    let lastScroll = 0;
    const header = document.querySelector('.site-header');
    if(!header) return; // no header on some pages
    window.addEventListener('scroll', () => {
        const current = window.pageYOffset || document.documentElement.scrollTop;
        // only toggle after a small threshold to avoid flicker
        if (current > lastScroll && current > 80) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        lastScroll = Math.max(0, current);
    }, { passive: true });
})();

const fade = document.querySelectorAll('.Fade');
window.addEventListener('scroll', checkFades);

checkFades();

function checkFades(){
    const triggerBottom = window.innerHeight / 5 * 4;

    fade.forEach((Fade) => {
        // guard: Fade elements may be different; use their own bounds
        const boxtop = Fade.getBoundingClientRect().top;
        if (boxtop < triggerBottom){
            Fade.classList.add('Fadein');
        } else {
            Fade.classList.remove('Fadein');
        }

    })
};
