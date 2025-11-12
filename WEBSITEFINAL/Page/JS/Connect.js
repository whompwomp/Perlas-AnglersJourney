// Simple client-side form handler for Connect.html
// Validates inputs and opens user's email client using mailto: as a fallback.

document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    status.hidden = true;

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    // basic validation
    if(!name){
      showStatus('Please enter your name', true);
      form.name.focus();
      return;
    }
    if(!validateEmail(email)){
      showStatus('Please enter a valid email address', true);
      form.email.focus();
      return;
    }
    if(!message){
      showStatus('Please enter a message', true);
      form.message.focus();
      return;
    }

    // Build mailto: link (works as fallback and opens user's email client)
    const to = 'youremail@example.com'; // <-- replace with your destination email
    const subject = encodeURIComponent('Website message from ' + name);
    const body = encodeURIComponent(
      'Name: ' + name + '\n' +
      'Email: ' + email + '\n\n' +
      message
    );

    const mailto = `mailto:${to}?subject=${subject}&body=${body}`;

    // try to open mail client
    window.location.href = mailto;
    showStatus('Opening your email client to send the message...', false);
  });

  function showStatus(msg, isError){
    status.textContent = msg;
    status.style.color = isError ? '#b00020' : '#0b3';
    status.hidden = false;
  }

  function validateEmail(email){
    // simple regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});
