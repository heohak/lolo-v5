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
        document.getElementById('modal').classList.remove('show');
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
            feedColor,
            sourceUrl: url
        });
    });
}

function displayArticles() {
    const articlesContainer = document.getElementById('articles-container');
    articlesContainer.innerHTML = '';

    allArticles.forEach(article => {
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
