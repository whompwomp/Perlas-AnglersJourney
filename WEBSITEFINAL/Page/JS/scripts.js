document.getElementById('payment-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const amount = document.getElementById('amount').value;
    const paymentMethod = document.getElementById('payment-method').value;

    // Simple validation
    if (name && email && amount && paymentMethod) {
        alert(`Payment of ${amount} via ${paymentMethod} is being processed for ${name}.`);
        
        // Here, you would add code to handle the payment through the selected method
        // For example, redirecting to a payment gateway, etc.
    } else {
        alert('Please fill out all fields.');
    }
});
