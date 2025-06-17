document.addEventListener('DOMContentLoaded', () => {

    // Get the form element from the page
    const addRecordForm = document.getElementById('addRecordForm');

    // Add an event listener that runs when the form is submitted
    if (addRecordForm) {
        addRecordForm.addEventListener('submit', async (e) => {
            // 1. Prevent the default form submission which reloads the page
            e.preventDefault();

            // Create a container for potential error messages
            let errorDiv = document.getElementById('error-message');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = 'error-message';
                errorDiv.style.color = 'red';
                errorDiv.style.marginBottom = '15px';
                addRecordForm.prepend(errorDiv);
            }
            errorDiv.textContent = ''; // Clear previous errors

            // 2. Gather the data from all the form fields
            const recordData = {
                name: document.getElementById('record-name').value,
                date: document.getElementById('record-date').value,
                categoryId: document.getElementById('record-category').value,
                merchant: document.getElementById('record-merchant').value,
                amount: document.getElementById('record-amount').value,
                type: 'expense' // Since the form is hard-coded for expenses
            };

            // 3. Send the data to your backend API using fetch
            try {
                const response = await fetch('/api/records', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(recordData),
                    // This is crucial for sending your login session cookie
                    credentials: 'include' 
                });

                // 4. Handle the response from the server
                if (response.ok) {
                    // If the record was created successfully, redirect to the dashboard
                    console.log('Record created! Redirecting...');
                    window.location.href = '/tracker'; // Or your main dashboard page
                } else {
                    // If the server sent an error, display it
                    const errorResult = await response.json();
                    errorDiv.textContent = errorResult.message || 'An error occurred. Please check your input.';
                }
            } catch (error) {
                // Handle network errors (e.g., server is down)
                console.error('Submission failed:', error);
                errorDiv.textContent = 'A network error occurred. Please try again later.';
            }
        });
    }
});
