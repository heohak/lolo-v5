document.addEventListener('DOMContentLoaded', function () {
    initializeDefaultFeed();
    displayFeedList();
    loadFeeds();
    // Adds a new feed URL to local storage and reloads the feed list.
    window.addFeed = function () {
        const url = document.getElementById('feed-url').value;
        if (url && !JSON.parse(localStorage.getItem('feeds') || '[]').includes(url)) {
            let feeds = JSON.parse(localStorage.getItem('feeds') || '[]');
            feeds.push(url);
            localStorage.setItem('feeds', JSON.stringify(feeds));
            displayFeedList();
            loadFeeds();
        }
        document.getElementById('feed-url').value = '';
    };
    // Edits an existing feed URL and updates local storage and UI.
    window.editFeed = function (index) {
        let feeds = JSON.parse(localStorage.getItem('feeds'));
        const newUrl = prompt("Edit the feed URL:", feeds[index]);
        if (newUrl && newUrl !== feeds[index]) {
            feeds[index] = newUrl;
            localStorage.setItem('feeds', JSON.stringify(feeds));
            displayFeedList();
            loadFeeds();
        }
    };
    // Removes a feed URL from local storage and updates the UI.
    window.removeFeed = function (index) {
        let feeds = JSON.parse(localStorage.getItem('feeds'));
        feeds.splice(index, 1);
        localStorage.setItem('feeds', JSON.stringify(feeds));
        displayFeedList();
        loadFeeds();
    };
    // Closes the modal and resets its visibility.
    window.closeModal = function () {
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modalContent.classList.remove('loading');
    };
});

function initializeDefaultFeed() {
    if (!localStorage.getItem('feeds')) {
        let defaultFeed = ['https://flipboard.com/@raimoseero/feed-nii8kd0sz.rss'];
        localStorage.setItem('feeds', JSON.stringify(defaultFeed));
    }
}

let allArticles = [];

// Loads feeds from local storage and processes each one.
function loadFeeds() {
    let feeds = JSON.parse(localStorage.getItem('feeds') || '[]');
    allArticles = [];
    const articlesContainer = document.getElementById('articles-container');
    articlesContainer.innerHTML = '';
    let feedsProcessed = 0;
    feeds.forEach(url => {
        loadFeed(url, () => {
            feedsProcessed++;
            if (feedsProcessed === feeds.length) {
                allArticles.sort((a, b) => b.pubDate - a.pubDate);
                displayCategoryFilters();
                displayArticles();
            }
        });
    });
}

// Fetches data from a feed URL and parses the XML.
function loadFeed(url, callback) {
    fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "application/xml");
            extractAndStoreArticles(xmlDoc, url);
            if (callback) callback();
        });
}

// Extracts articles from the XML document and stores them in an array.
function extractAndStoreArticles(xmlDoc, url) {
    let items = xmlDoc.querySelectorAll('item');
    let feedIndex = JSON.parse(localStorage.getItem('feeds')).indexOf(url);
    let colors = ['#3c988c', '#1c80dc', '#b48537', '#7e1f79', '#ffdead'];
    let feedColor = colors[feedIndex % colors.length];

    items.forEach(item => {
        let categories = Array.from(item.querySelectorAll('category')).map(cat => cat.textContent);
        let title = item.querySelector('title') ? item.querySelector('title').textContent : 'No Title';
        let descriptionElement = item.querySelector('description');
        let description = descriptionElement ? descriptionElement.textContent : 'No description available.';
        let pubDate = item.querySelector('pubDate') ? new Date(item.querySelector('pubDate').textContent) : new Date();
        let author = item.querySelector('author') ? item.querySelector('author').textContent : 'Unknown';
        let imageElement = item.querySelector('media\\:content, content');
        let imageUrl = imageElement ? imageElement.getAttribute('url') : 'assets/placeholder.jpg';

        allArticles.push({
            title,
            link: item.querySelector('link').textContent,
            description,
            pubDate,
            author,
            imageUrl,
            categories,
            feedColor,
            sourceUrl: url
        });
    });
}

// Displays all articles in the UI.
function displayArticles(articles = allArticles) {
    const articlesContainer = document.getElementById('articles-container');
    articlesContainer.innerHTML = '';

    articles.forEach(article => {
        let articleElement = document.createElement('div');
        articleElement.className = 'article-card';
        articleElement.style.borderColor = article.feedColor;

        articleElement.innerHTML = `
            <div class="article-image">
                <img src="${article.imageUrl}" alt="Image">
            </div>
            <div class="article-content">
                <h4 class="article-title">${article.title}</h4>
                <p class="article-description">${article.description}</p>
                <div class="article-meta">
                    <span class="article-author">${article.author}</span> - <span class="article-date">${article.pubDate.toLocaleDateString()}</span>
                </div>
                <div class="article-feed" style="background-color: ${article.feedColor};">Source: ${article.sourceUrl}</div>
            </div>
        `;

        articlesContainer.appendChild(articleElement);

        const img = articleElement.querySelector('.article-image img');
        const title = articleElement.querySelector('.article-title');
        const description = articleElement.querySelector('.article-description');

        [img, title, description].forEach(element => {
            element.addEventListener('click', () => openArticle(article.link));
        });
    });
}

// Opens a modal to display an article using the provided URL.
function openArticle(url) {
    const modal = document.getElementById('modal');
    const articleContent = document.getElementById('article-content');
    const modalContent = modal.querySelector('.modal-content');

    articleContent.innerHTML = '';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modalContent.classList.add('loading');

    fetch('https://lolo-v5.onrender.com/webparser', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({url: url})
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            articleContent.innerHTML = data.content || 'No content available';
            modalContent.classList.remove('loading');
        })
        .catch(error => {
            console.error('Error loading article:', error);
            articleContent.innerHTML = 'Failed to load content.';
            modalContent.classList.remove('loading');
        });
}

// Displays the list of feeds in the UI.
function displayFeedList() {
    const feedList = document.getElementById('feed-list');
    feedList.innerHTML = '';

    let feeds = JSON.parse(localStorage.getItem('feeds') || '[]');
    feeds.forEach((feed, index) => {
        let li = document.createElement('li');

        let urlContainer = document.createElement('div');
        urlContainer.className = 'url-container';
        let urlLink = document.createElement('a');
        urlLink.href = feed;
        urlLink.textContent = feed;
        urlContainer.appendChild(urlLink);

        let buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        let editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.onclick = () => window.editFeed(index);
        buttonContainer.appendChild(editButton);

        let removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => window.removeFeed(index);
        buttonContainer.appendChild(removeButton);

        li.appendChild(urlContainer);
        li.appendChild(buttonContainer);
        feedList.appendChild(li);
    });
}

// Displays category filters for articles.
function displayCategoryFilters() {
    const allCategories = new Set();
    allArticles.forEach(article => {
        article.categories.forEach(category => allCategories.add(category));
    });

    const filterContainer = document.getElementById('category-filters');
    filterContainer.innerHTML = '';

    const dropdown = document.createElement('select');
    dropdown.id = 'category-dropdown';
    dropdown.onchange = filterArticlesByCategory;

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'All Categories';
    defaultOption.value = 'all';
    dropdown.appendChild(defaultOption);

    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        dropdown.appendChild(option);
    });

    filterContainer.appendChild(dropdown);
}

// Filters articles by selected category.
function filterArticlesByCategory() {
    const selectedCategory = document.getElementById('category-dropdown').value;
    const filteredArticles = selectedCategory === 'all' ? allArticles : allArticles.filter(article =>
        article.categories.includes(selectedCategory)
    );
    displayArticles(filteredArticles);
}
