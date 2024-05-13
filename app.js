document.addEventListener('DOMContentLoaded', function() {
    displayFeedList();
    loadFeeds();

    window.addFeed = function() {
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

    window.editFeed = function(index) {
        let feeds = JSON.parse(localStorage.getItem('feeds'));
        const newUrl = prompt("Edit the feed URL:", feeds[index]);
        if (newUrl && newUrl !== feeds[index]) {
            feeds[index] = newUrl;
            localStorage.setItem('feeds', JSON.stringify(feeds));
            displayFeedList();
            loadFeeds();
        }
    };

    window.removeFeed = function(index) {
        let feeds = JSON.parse(localStorage.getItem('feeds'));
        feeds.splice(index, 1);
        localStorage.setItem('feeds', JSON.stringify(feeds));
        displayFeedList();
        loadFeeds();
    };

    window.closeModal = function() {
        const modal = document.getElementById('modal');
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    };
});

let allArticles = [];

function loadFeeds() {
    let feeds = JSON.parse(localStorage.getItem('feeds') || '[]');
    allArticles = [];
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
        let imageUrl = imageElement ? imageElement.getAttribute('url') : 'placeholder.jpg';

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

function displayArticles(articles = allArticles) {
    const articlesContainer = document.getElementById('articles-container');
    articlesContainer.innerHTML = '';

    articles.forEach(article => {
        let articleElement = document.createElement('div');
        articleElement.className = 'article-card';
        articleElement.style.borderColor = article.feedColor;

        // Create the article content with clickable elements
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

        // Append the article card to the container
        articlesContainer.appendChild(articleElement);

        // Add event listeners to title, description, and image for opening the article
        const img = articleElement.querySelector('.article-image img');
        const title = articleElement.querySelector('.article-title');
        const description = articleElement.querySelector('.article-description');

        [img, title, description].forEach(element => {
            element.addEventListener('click', () => openArticle(article.link));
        });
    });
}

function openArticle(url) {
    const modal = document.getElementById('modal');
    const articleContent = document.getElementById('article-content');
    articleContent.innerHTML = 'Loading...';

    fetch('http://localhost:3000/webparser', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            articleContent.innerHTML = data.content || 'No content available'; // Display content or a default message
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
        })
        .catch(error => {
            console.error('Error loading article:', error);
            articleContent.innerHTML = 'Failed to load content.';
        });
}

function displayFeedList() {
    const feedList = document.getElementById('feed-list');
    feedList.innerHTML = '';

    let feeds = JSON.parse(localStorage.getItem('feeds') || '[]');
    feeds.forEach((feed, index) => {
        let li = document.createElement('li');
        li.textContent = feed;
        let editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.onclick = () => window.editFeed(index);
        let removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => window.removeFeed(index);
        li.appendChild(editButton);
        li.appendChild(removeButton);
        feedList.appendChild(li);
    });
}

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

function filterArticlesByCategory() {
    const selectedCategory = document.getElementById('category-dropdown').value;
    const filteredArticles = selectedCategory === 'all' ? allArticles : allArticles.filter(article =>
        article.categories.includes(selectedCategory)
    );
    displayArticles(filteredArticles);
}
