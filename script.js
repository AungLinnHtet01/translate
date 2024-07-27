document.getElementById('videoFile').addEventListener('change', handleVideoFile, false);
document.getElementById('subtitleFile').addEventListener('change', handleSubtitleFile, false);
document.getElementById('saveSubtitles').addEventListener('click', saveSubtitles, false);

let videoElement = document.getElementById('video');
let subtitleDisplay = document.getElementById('subtitleDisplay');
let lineList = document.getElementById('lineList');
let originalText = document.getElementById('originalText');
let editedText = document.getElementById('editedText');
let subtitles = [];
let styles = {};
let currentFileType = '';
let currentSubtitleIndex = -1;

function handleVideoFile(event) {
    let file = event.target.files[0];
    if (file) {
        let fileURL = URL.createObjectURL(file);
        videoElement.src = fileURL;
    }
}

function handleSubtitleFile(event) {
    let file = event.target.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let content = e.target.result;
            currentFileType = file.name.split('.').pop();
            parseSubtitles(content, currentFileType);
        };
        reader.readAsText(file);
    }
}

function parseSubtitles(content, type) {
    subtitles = [];
    styles = {};
    lineList.innerHTML = '';

    let lines = content.split('\n');
    let styleLines = [];
    
    lines.forEach(line => {
        if (line.startsWith('Style:')) {
            styleLines.push(line);
        } else if (line.startsWith('Dialogue:')) {
            let parts = line.split(',');
            let layer = parts[0].split(':')[1].trim();
            let start = parts[1].trim();
            let end = parts[2].trim();
            let styleName = parts[3].trim();
            let text = parts.slice(9).join(',').replace(/{.*?}/g, '').trim();
            let styles = parts.slice(9).join(',').match(/{(.*?)}/g); // Extract style tags

            let subtitle = {
                layer: layer,
                start: start,
                end: end,
                styleName: styleName,
                text: text,
                styles: styles ? styles.join(' ') : '' // Join and store style tags
            };
            subtitles.push(subtitle);
            addSubtitleLine(subtitle);
        }
    });

    parseStyles(styleLines);
}

function parseStyles(styleLines) {
    styleLines.forEach(line => {
        let parts = line.split(',');
        let styleName = parts[1].trim();
        let fontName = parts[2].trim();
        let fontSize = parts[3].trim();
        let primaryColor = parts[4].trim();
        let secondaryColor = parts[5].trim();
        let borderStyle = parts[6].trim();
        let outline = parts[7].trim();
        let shadow = parts[8].trim();

        styles[styleName] = {
            fontName: fontName,
            fontSize: fontSize,
            primaryColor: primaryColor,
            secondaryColor: secondaryColor,
            borderStyle: borderStyle,
            outline: outline,
            shadow: shadow
        };
    });
}

function addSubtitleLine(subtitle) {
    let lineItem = document.createElement('div');
    lineItem.className = 'line-item';
    lineItem.textContent = subtitle.text;
    lineItem.dataset.index = subtitles.indexOf(subtitle);
    lineItem.dataset.start = timeToSeconds(subtitle.start);
    lineItem.dataset.end = timeToSeconds(subtitle.end);
    lineItem.dataset.styles = subtitle.styles; // Store styles in dataset
    lineItem.dataset.styleName = subtitle.styleName; // Store style name
    lineItem.addEventListener('click', () => {
        videoElement.currentTime = timeToSeconds(subtitle.start);
        videoElement.play();
        originalText.value = subtitle.text;
        editedText.value = subtitle.editedText || '';
        currentSubtitleIndex = parseInt(lineItem.dataset.index, 10);
        originalText.focus();
    });
    lineList.appendChild(lineItem);
}

function displaySubtitle() {
    let currentTime = videoElement.currentTime;
    let currentSubtitle = subtitles.find(sub => currentTime >= timeToSeconds(sub.start) && currentTime <= timeToSeconds(sub.end));
    if (currentSubtitle) {
        subtitleDisplay.style.display = 'block';
        subtitleDisplay.textContent = currentSubtitle.editedText || currentSubtitle.text;
    } else {
        subtitleDisplay.style.display = 'none';
    }
}

function timeToSeconds(time) {
    let parts = time.split(':');
    let seconds = 0;
    if (parts.length === 3) {
        seconds += parseFloat(parts[0]) * 3600;
        seconds += parseFloat(parts[1]) * 60;
        seconds += parseFloat(parts[2].replace(',', '.'));
    }
    return seconds;
}

function saveSubtitles() {
    if (currentSubtitleIndex !== -1) {
        subtitles[currentSubtitleIndex].editedText = editedText.value;
        updateLineItem(currentSubtitleIndex, editedText.value);
    }

    let editedSubtitles = '';
    let styleDefinitions = '';

    // Generate style definitions
    for (let styleName in styles) {
        let style = styles[styleName];
        styleDefinitions += `Style: ${styleName},${style.fontName},${style.fontSize},${style.primaryColor},${style.secondaryColor},${style.borderStyle},${style.outline},${style.shadow}\n`;
    }

    // Generate subtitle lines
    subtitles.forEach(sub => {
        let start = sub.start;
        let end = sub.end;
        let text = sub.editedText || sub.text;
        let styles = sub.styles;
        if (currentFileType === 'ass') {
            editedSubtitles += `Dialogue: ${sub.layer},${start},${end},${sub.styleName},,0,0,0,,${styles} ${text}\n`;
        }
    });

    let blob = new Blob([styleDefinitions + editedSubtitles], { type: 'text/plain' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `subtitles.${currentFileType}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateLineItem(index, editedText) {
    let lineItem = lineList.querySelector(`.line-item[data-index="${index}"]`);
    if (lineItem) {
        lineItem.textContent = editedText;
    }
}

function secondsToTime(seconds) {
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let secs = (seconds % 60).toFixed(2).replace('.', ',');

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(5, '0')}`;
}

videoElement.addEventListener('timeupdate', displaySubtitle);

// Update subtitles array and line list item when edited text changes
editedText.addEventListener('input', () => {
    if (currentSubtitleIndex !== -1) {
        subtitles[currentSubtitleIndex].editedText = editedText.value;
        updateLineItem(currentSubtitleIndex, editedText.value);
    }
});
