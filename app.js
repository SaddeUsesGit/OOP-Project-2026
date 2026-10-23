document.getElementById('fetchDataBtn').addEventListener('click', fetchRecords);

async function fetchRecords() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        const tableBody = document.getElementById('dataTableBody');
        tableBody.innerHTML = ''; // Clear old rows

        data.forEach(user => {
            const row = `<tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Automatically fetch records when page loads
window.onload = fetchRecords;
