let songs = []
let songartists = []
let audio = new Audio()
let currentIndex = 0
let isPlaying = false
let currentFolder = ""

function format(t) {
    let minutes = Math.floor(t / 60)
    let seconds = Math.floor(t % 60)
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`
}

async function getSongs(folder) {
    let a = await fetch(`http://192.168.0.101:3000/songs/${encodeURIComponent(folder)}/`)
    let response = await a.text()
    let div = document.createElement("div")
    div.innerHTML = response
    let as = div.getElementsByTagName("a")
    let songlist = []
    for (let element of as) {
        if (element.href.endsWith(".mp3")) {
            let name = decodeURIComponent(element.href.split(`${encodeURIComponent(folder)}/`)[1])
            songlist.push(name)
        }
    }
    return songlist
}

async function getSongartists(folder) {
    let a = await fetch(`http://192.168.0.101:3000/songs/${encodeURIComponent(folder)}/`)
    let response = await a.text()
    let div = document.createElement("div")
    div.innerHTML = response
    let as = div.getElementsByTagName("a")
    let songartistlist = []
    for (let element of as) {
        if (element.href.endsWith(".mp3")) {
            let filename = decodeURIComponent(element.href.split(`${encodeURIComponent(folder)}/`)[1].replace(".mp3", ""))
            let artist = filename.substring(filename.lastIndexOf("_") + 1)
            songartistlist.push(artist || "Unknown Artist")
        }
    }
    return songartistlist
}

function updatePlaybarInfo() {
    if (songs[currentIndex]) {
        const song = songs[currentIndex]
        const artist = songartists[currentIndex]
        document.querySelector(".songname").innerText = decodeURIComponent(song.split("_")[0].replace(".mp3", ""))
        document.querySelector(".songartist").innerText = decodeURIComponent(artist)
    }
}

function getDuration() {
    if (audio.readyState >= 1) {
        document.querySelector(".entire-duration").innerText = format(audio.duration)
    } else {
        audio.addEventListener("loadedmetadata", () => {
            document.querySelector(".entire-duration").innerText = format(audio.duration)
        }, { once: true })
    }
}

function setupSongPlayButtons() {
    const buttons = document.querySelectorAll(".play-button")
    buttons.forEach(button => {
        button.addEventListener("click", async (e) => {
            const index = parseInt(e.target.dataset.index)
            if (isNaN(index)) return

            currentIndex = index
            audio.src = `http://192.168.0.101:3000/songs/${encodeURIComponent(currentFolder)}/${encodeURIComponent(songs[currentIndex])}`
            audio.addEventListener("loadedmetadata", async () => {
                updatePlaybarInfo()
                getDuration()
                try {
                    await audio.play()
                    document.getElementById("playbutton").src = "svgs/pause.svg"
                    isPlaying = true
                } catch (err) {
                    console.error("Playback failed", err)
                }
            }, { once: true })
        })
    })
}

function displaySongs() {
    const ul = document.querySelector(".songlist ul")
    ul.innerHTML = ""
    for (let i = 0; i < songs.length; i++) {
        let name = songs[i].split("_")[0].replaceAll("%20", " ")
        let artist = songartists[i].replaceAll("%20", " ").replace(".mp3", "")
        ul.innerHTML += `
        <li>
            <div class="music">
                <img src="svgs/music.svg" alt="">
                <div class="info">
                    <div class="name">${name}</div>
                    <div class="artist">${artist}</div>
                </div>
            </div>
            <div class="playnow flex">
                <img class="play-button items-center" src="svgs/play.svg" alt="Play" data-index="${i}">
            </div>
        </li>`
    }
    setupSongPlayButtons()
}

// Event listener for each .card (load songs on card click)
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", async (e) => {
            if (e.target.classList.contains("play-button")) return

            const link = card.querySelector(".title a")
            const href = link?.getAttribute("href")
            if (!href) return

            e.preventDefault()

            const folder = decodeURIComponent(href.split("/").filter(Boolean).pop())
            currentFolder = folder
            songs = await getSongs(folder)
            songartists = await getSongartists(folder)
            displaySongs()
        })
    })
})


// Main Controls
document.getElementById("playbutton").addEventListener("click", async () => {
    if (!audio.src || !songs.length) return
    if (isPlaying) {
        audio.pause()
        document.getElementById("playbutton").src = "svgs/play.svg"
    } else {
        try {
            await audio.play()
            document.getElementById("playbutton").src = "svgs/pause.svg"
        } catch (err) {
            console.error("Play error", err)
        }
    }
    isPlaying = !isPlaying
})

document.getElementById("nextbutton").addEventListener("click", async () => {
    if (songs.length === 0) return
    currentIndex = (currentIndex + 1) % songs.length
    audio.src = `http://192.168.0.101:3000/songs/${encodeURIComponent(currentFolder)}/${encodeURIComponent(songs[currentIndex])}`
    updatePlaybarInfo()
    getDuration()
    try {
        await audio.play()
        document.getElementById("playbutton").src = "svgs/pause.svg"
        isPlaying = true
    } catch (err) {
        console.error("Next error", err)
    }
})

document.getElementById("replaybutton").addEventListener("click", async () => {
    audio.currentTime = 0
    if (!isPlaying) {
        try {
            await audio.play()
            document.getElementById("playbutton").src = "svgs/pause.svg"
            isPlaying = true
        } catch (err) {
            console.error("Replay error", err)
        }
    }
})

// Duration and seekbar
audio.ontimeupdate = () => {
    let current = audio.currentTime
    document.querySelector(".current-duration").innerText = format(current)
    let percent = (current / audio.duration) * 100
    document.querySelector(".seekbar-fill").style.width = `${percent}%`
    document.querySelector(".seekbar-circle").style.left = `${percent}%`
}

// Seekbar click
document.querySelector(".seekbar").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * audio.duration
})

// Volume control
const volumeSlider = document.querySelector(".slider")
const volumeIcon = document.getElementById("volume-icon")

volumeSlider.addEventListener("input", () => {
    const vol = volumeSlider.value / 100
    audio.volume = vol
    updateVolumeUI(vol)
})

volumeIcon.addEventListener("click", () => {
    if (audio.volume > 0) {
        audio.dataset.prevVolume = audio.volume
        audio.volume = 0
    } else {
        audio.volume = audio.dataset.prevVolume || 1
    }
    volumeSlider.value = audio.volume * 100
    updateVolumeUI(audio.volume)
})

function updateVolumeUI(vol) {
    if (vol === 0) {
        volumeIcon.src = "svgs/mute.svg"
    } else if (vol < 0.5) {
        volumeIcon.src = "svgs/volume2.svg"
    } else {
        volumeIcon.src = "svgs/volume1.svg"
    }
}

// Hamburger menu
document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0"
})
document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-100%"
})

// Play first song in the folder when .card .play-button is clicked
document.querySelectorAll(".card .play-button").forEach(playBtn => {
    playBtn.addEventListener("click", async (e) => {
        const card = e.target.closest(".card")
        const link = card.querySelector(".title a")
        const href = link?.getAttribute("href")
        if (!href) return

        e.preventDefault()

        const folder = decodeURIComponent(href.split("/").filter(Boolean).pop())
        currentFolder = folder
        songs = await getSongs(folder)
        songartists = await getSongartists(folder)
        displaySongs()

        if (songs.length > 0) {
            currentIndex = 0
            audio.src = `http://192.168.0.101:3000/songs/${encodeURIComponent(currentFolder)}/${encodeURIComponent(songs[0])}`
            updatePlaybarInfo()
            getDuration()
            try {
                await audio.play()
                document.getElementById("playbutton").src = "svgs/pause.svg"
                isPlaying = true
            } catch (err) {
                console.error("Autoplay failed:", err)
            }
        }
    })
})

audio.addEventListener("ended", async () => {
    if (songs.length === 0) return
    currentIndex = (currentIndex + 1) % songs.length
    audio.src = `http://192.168.0.101:3000/songs/${encodeURIComponent(currentFolder)}/${encodeURIComponent(songs[currentIndex])}`
    updatePlaybarInfo()
    getDuration()
    try {
        await audio.play()
        document.getElementById("playbutton").src = "svgs/pause.svg"
        isPlaying = true
    } catch (err) {
        console.error("Autoplay next failed:", err)
    }
})

