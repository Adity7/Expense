document.addEventListener('DOMContentLoaded', function () {
    // --- Get references to the HTML elements ---
    const revenueForm = document.getElementById('revenue-form');
    const categorySelect = document.getElementById('category-dropdown');

    // Stop if the required form elements aren't on the page
    if (!revenueForm || !categorySelect) {
        return;
    }

    // Create a div to show error messages to the user
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3 d-none'; // Start hidden
    revenueForm.prepend(errorDiv);

    /**
     * Fetches only 'revenue' type categories from the API 
     * and builds the dropdown menu.
     */
    async function populateRevenueCategories() {
        try {
            // This API call specifically requests revenue categories
            const response = await fetch('/api/records/categories?type=revenue');
            if (!response.ok) {
                throw new Error('Server responded with an error!');
            }
            const categories = await response.json();

            // Clear the "Loading..." placeholder
            categorySelect.innerHTML = '<option value="">-- Please choose a category --</option>';

            // Create a new <option> for each category returned by the API
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;       // The value is the real database ID
                option.textContent = category.name; // The text is the category name
                categorySelect.appendChild(option);
            });

        } catch (error) {
            console.error('Failed to load revenue categories:', error);
            errorDiv.textContent = 'Could not load categories. Please ensure the server is running and the API is correct.';
            errorDiv.classList.remove('d-none');
        }
    }

    /**
     * Handles the form submission when the user clicks "Create Revenue".
     */
    revenueForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Stop the browser from reloading the page
        errorDiv.classList.add('d-none'); // Hide old errors

        const formData = new FormData(revenueForm);
        const data = Object.fromEntries(formData.entries());

        if (!data.categoryId) {
            errorDiv.textContent = 'You must select a category.';
            errorDiv.classList.remove('d-none');
            return;
        }

        try {
            // Send the form data to the server's records API
            const response = await fetch('/api/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                window.location.href = '/tracker'; // Success! Go back to the dashboard.
            } else {
                const result = await response.json();
                errorDiv.textContent = result.message || 'An unknown error occurred.';
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            errorDiv.textContent = 'Could not submit form. Please check your connection.';
            errorDiv.classList.remove('d-none');
        }
    });

    // --- Initial Load ---
    // Fetch and display the categories as soon as the page is ready.
    populateRevenueCategories();
});
