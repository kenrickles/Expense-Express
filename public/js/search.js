const searchInput = document.getElementById('search');
const rows = document.querySelectorAll('tbody tr');
searchInput.addEventListener('keyup', (event) => {
  const typing = event.target.value.toLowerCase();
  console.log(typing);
  rows.forEach((row) => {
    if (row.querySelectorAll('td')[0].textContent.trim().toLowerCase().startsWith(typing) === true
    || row.querySelectorAll('td')[1].textContent.trim().toLowerCase().startsWith(typing) === true
    || row.querySelectorAll('td')[2].textContent.trim().toLowerCase().startsWith(typing) === true
    || row.querySelectorAll('td')[3].textContent.trim().toLowerCase().startsWith(typing) === true
    || row.querySelectorAll('td')[4].textContent.trim().toLowerCase().startsWith(typing) === true) {
      row.style.display = 'table-row';
    } else {
      row.style.display = 'none';
    }
  });
});
