class TableCSVExporter {
  constructor(table, includeHeaders = true) {
    //
    this.table = table;
    this.rows = Array.from(table.querySelectorAll('tr'));
    if (!includeHeaders && this.rows[0].querySelectorAll('th').length) {
      // remove header for option if user does not want headers
      this.rows.shift();
    }
  }

  convertToCSV() {
    // eslint-disable-next-line max-len
    // loop inside each row and creating a string for each row and appending to an array of lines and combining it with a line break
    const lines = [];
    const numCols = this.findLongestRowLength();
    // eslint-disable-next-line no-restricted-syntax
    for (const row of this.rows) {
      let line = '';
      for (let i = 0; i < numCols; i += 1) {
        if (row.children[i] !== undefined) {
          line += TableCSVExporter.parseCell(row.children[i]);
        }
        // if index is not the last cell, add a , if not add nothing
        line += (i !== (numCols - 1)) ? ',' : '';
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  // tells us the longest row length because CSV needs to know as some row might not have everything
  findLongestRowLength() {
    return this.rows.reduce((length, row) => (row.childElementCount > length ? row.childElementCount : length), 0);
  }

  static parseCell(tableCell) {
    let parsedValue = tableCell.textContent;
    // replace all double quotes with two double quotes because of CSV formatting
    // eslint-disable-next-line quotes
    parsedValue = parsedValue.replace(/"/g, `""`);
    // if value contains a new line, comma or double-quotes, enclose in double quotes
    parsedValue = /[",\n]/.test(parsedValue) ? `"${parsedValue}"` : parsedValue;
    console.log(parsedValue);
    return parsedValue;
  }
}
// select table to export
const dataTable = document.getElementById('dataTable');
// select button to export
const btnExportToCSV = document.getElementById('btnExportToCSV');
// add event listner to Export Button
btnExportToCSV.addEventListener('click', () => {
  // creating a new constructor to select the data table
  const exporter = new TableCSVExporter(dataTable);
  // looping inside each row and creating a string to push it to array and adding a line break
  const csvOutput = exporter.convertToCSV();
  // creating a blob to be exported, adding type to text/csv
  const csvBlob = new Blob([csvOutput], { type: 'text/csv' });
  // creating a export URL
  const blobURL = URL.createObjectURL(csvBlob);
  // creating a tag of <a>
  const anchorElement = document.createElement('a');
  // adding the url link to the tag
  anchorElement.href = blobURL;
  // naming the export-table
  anchorElement.download = 'expense-table.csv';
  // making the anchor element clickable
  anchorElement.click();
  // setting time out as to not use too much browser memory, as blob url takes up memory
  setTimeout(() => {
    URL.revokeObjectURL(blobURL);
  }, 500);
});
