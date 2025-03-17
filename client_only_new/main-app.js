/**
 * Chat Links Extractor
 * Client-side tool for extracting and displaying links from chat exports
 */
class ChatLinksExtractor {
    constructor() {
      this.linksHelper = new LinksHelper();
      this.initializeUI();
    }
    
    initializeUI() {
      // File upload area
      this.fileInput = document.getElementById('file-upload');
      this.uploadForm = document.getElementById('upload-form');
      this.processingIndicator = document.getElementById('processing');
      this.resultsTable = document.getElementById('results-table');
      this.resultsContainer = document.getElementById('results-container');
      this.optionsForm = document.getElementById('options-form');
      
      // Set up event listeners
      this.uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.processFile();
      });
      
      // Add sorting functionality
      document.querySelectorAll('th[data-sort]').forEach(headerCell => {
        headerCell.addEventListener('click', () => {
          this.sortTable(headerCell.dataset.sort);
        });
      });
    }
    
    async processFile() {
      const fileInput = this.fileInput;
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file to upload');
        return;
      }
      
      const file = fileInput.files[0];
      this.processingIndicator.classList.remove('hidden');
      
      try {
        // Read the file as text
        const chatText = await this.readFileAsText(file);
        
        // Get options
        const options = {
          expandSpotify: document.getElementById('expand-spotify').checked,
          expandYoutube: document.getElementById('expand-youtube').checked,
          expandGeneral: document.getElementById('expand-general').checked
        };
        
        // Process chat text
        const links = await this.linksHelper.analyseChat(chatText, options);
        
        // Display results
        this.displayResults(links);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file: ' + error.message);
      } finally {
        this.processingIndicator.classList.add('hidden');
      }
    }
    
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
    }
    
    displayResults(links) {
      if (links.length === 0) {
        this.resultsContainer.innerHTML = '<p>No links found in the chat.</p>';
        return;
      }
      
      // Clear previous results
      const tbody = this.resultsTable.querySelector('tbody');
      tbody.innerHTML = '';
      
      // Add links to table
      links.forEach(link => {
        const row = document.createElement('tr');
        
        // Create timestamp cell
        const timestampCell = document.createElement('td');
        timestampCell.textContent = link.timestamp || 'Unknown';
        timestampCell.className = 'p-2 border';
        row.appendChild(timestampCell);
        
        // Create user cell
        const userCell = document.createElement('td');
        userCell.textContent = link.user || 'Unknown';
        userCell.className = 'p-2 border';
        row.appendChild(userCell);
        
        // Create title cell with image preview
        const titleCell = document.createElement('td');
        titleCell.className = 'p-2 border';

        // Create content for title cell with image preview when available
        if (link.image_url) {
            const container = document.createElement('div');
            container.className = 'flex items-center';
            
            const image = document.createElement('img');
            image.src = link.image_url;
            image.alt = link.name || 'Preview';
            image.className = 'w-12 h-12 object-cover mr-2';
            container.appendChild(image);
            
            const titleDiv = document.createElement('div');
            titleDiv.textContent = link.name || new URL(link.url).hostname;
            container.appendChild(titleDiv);
            
            titleCell.appendChild(container);
        } else {
            titleCell.textContent = link.name || new URL(link.url).hostname;
        }
        row.appendChild(titleCell);
        
        // Create type cell
        const typeCell = document.createElement('td');
        typeCell.textContent = link.type || 'link';
        typeCell.className = 'p-2 border text-center';
        row.appendChild(typeCell);
        
        // Create URL cell with link
        const urlCell = document.createElement('td');
        urlCell.className = 'p-2 border';
        const urlLink = document.createElement('a');
        urlLink.href = link.url;
        urlLink.textContent = link.url;
        urlLink.target = '_blank';
        urlLink.rel = 'noopener noreferrer';
        urlLink.className = 'text-blue-600 hover:underline';
        urlCell.appendChild(urlLink);
        row.appendChild(urlCell);
        
        // Add row to table
        tbody.appendChild(row);
      });

      // Show results container
      this.resultsContainer.classList.remove('hidden');
    }

    sortTable(column) {
        const tbody = this.resultsTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Get current sort direction
        const header = this.resultsTable.querySelector(`th[data-sort="${column}"]`);
        const isAscending = header.classList.contains('sort-asc');

        // Update sort direction indicators
        this.resultsTable.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });

        header.classList.add(isAscending ? 'sort-desc' : 'sort-asc');

        // Determine column index
        const headerCells = Array.from(this.resultsTable.querySelectorAll('th'));
        const columnIndex = headerCells.findIndex(th => th.dataset.sort === column);

        // Sort rows
        rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent;
        const bValue = b.cells[columnIndex].textContent;
        
        if (column === 'timestamp') {
            // Parse dates for proper sorting
            return isAscending ? 
            new Date(aValue) - new Date(bValue) : 
            new Date(bValue) - new Date(aValue);
        }
    
        // Default string comparison
        return isAscending ? 
            aValue.localeCompare(bValue) : 
            bValue.localeCompare(aValue);
        });

        // Reattach rows in sorted order
        rows.forEach(row => tbody.appendChild(row));
    }
} // class

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
new ChatLinksExtractor();
});        