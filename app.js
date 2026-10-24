// Run the read function immediately when the page finishes loading so data shows up right away
window.onload = fetchRecords;

// Listeners for manual page interaction elements
document.getElementById('fetchDataBtn').addEventListener('click', fetchRecords);
document.getElementById('createForm').addEventListener('submit', createRecord);
document.getElementById('updateForm').addEventListener('submit', updateRecord);

// ==========================================
// 1. CREATE OPERATION (AJAX POST)
// ==========================================
async function createRecord(event) {
    event.preventDefault(); // Prevents the browser from reloading the page

    const name = document.getElementById('username').value;
    const email = document.getElementById('useremail').value;

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: name, useremail: email })
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('createForm').reset(); // Clear the form inputs
            fetchRecords(); // Instantly refresh table data visually
        } else {
            alert('Create Failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding record:', error);
    }
}

// ==========================================
// 2. READ OPERATION (AJAX GET)
// ==========================================
async function fetchRecords() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        const tableBody = document.getElementById('dataTableBody');
        tableBody.innerHTML = ''; // Clear old rows out of the container

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="padding: 8px; text-align: center;">No records found. database is empty.</td></tr>`;
            return;
        }

        data.forEach(user => {
            const row = `<tr>
                <td style="padding: 8px;">${user.id}</td>
                <td style="padding: 8px;">${user.name}</td>
                <td style="padding: 8px;">${user.email}</td>
                <td style="padding: 8px;">
                    <!-- Passes the unique DB Row ID directly into the delete routine when clicked -->
                    <button onclick="deleteRecord(${user.id})" style="background-color: #dc3545; color: white; border: none; padding: 4px 8px; cursor: pointer; border-radius: 4px;">
                        Delete
                    </button>
                </td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// ==========================================
// 3. UPDATE OPERATION (AJAX PUT)
// ==========================================
async function updateRecord(event) {
    event.preventDefault(); // Stop standard browser page reloads

    const userId = document.getElementById('updateId').value;
    const newEmail = document.getElementById('updateEmail').value;

    try {
        const response = await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, email: newEmail })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Record updated successfully!');
            document.getElementById('updateForm').reset(); // Reset form text fields
            fetchRecords(); // Instantly update view
        } else {
            alert('Update failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating record:', error);
    }
}

// ==========================================
// 4. DELETE OPERATION (AJAX DELETE)
// ==========================================
async function deleteRecord(id) {
    if (!confirm(`Are you sure you want to delete user ID #${id}?`)) return;

    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            fetchRecords(); // Remove from UI instantly
        } else {
            alert('Delete failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting record:', error);
    }
}
