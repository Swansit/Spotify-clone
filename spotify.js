let songs = []
let songartists = []
let audio = new Audio()
let currentIndex = 0
let isPlaying = false

// Fetch song list
async function getSongs() {
    let a = await fetch("http://192.168.0.101:3000/songs/")
    let response = await a.text()
    let div = document.createElement("div")
    div.innerHTML = response
    let as = div.getElementsByTagName("a")
    let songlist = []
    for (let index = 0; index < as.length; index++) {
        const element = as[index]
        if (element.href.endsWith(".mp3")) {
            songlist.push(element.href.split("/songs/")[1])
        }
    }
    return songlist
}

// Fetch artist names
async function getSongartists() {
    let a = await fetch("http://192.168.0.101:3000/songs/")
    let response = await a.text()
    let div = document.createElement("div")
    div.innerHTML = response
    let as = div.getElementsByTagName("a")
    let songartistlist = []

    for (let index = 0; index < as.length; index++) {
        const element = as[index]
        if (element.href.endsWith(".mp3")) {
            let filename = element.href.split("/songs/")[1].replace(".mp3", "")
            let lastUnderscoreIndex = filename.lastIndexOf("_")
            let artistPart = filename.substring(lastUnderscoreIndex + 1)
            artistPart = decodeURIComponent(artistPart)
            songartistlist.push(artistPart || "Unknown Artist")
        }
    }

    return songartistlist
}

function format(t) {
    let minutes = Math.floor(t / 60)
    let seconds = Math.floor(t % 60)
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`
}

// Get duration and show in playbar
function getDuration() {
    if (audio.readyState >= 1) {
        // Metadata already loaded
        let time = audio.duration
        let duration = format(time)
        document.querySelector(".entire-duration").innerHTML = duration
    } 
    else {
        audio.addEventListener("loadedmetadata", () => {
            let time = audio.duration
            let duration = format(time)
            document.querySelector(".entire-duration").innerHTML = duration
        }, { once: true })
    }
}

// Update playbar info
function updatePlaybarInfo() {
    if (songs[currentIndex]) {
        let song = songs[currentIndex]
        let artist = songartists[currentIndex]

        let songName = decodeURIComponent(song.split("_")[0].replace(".mp3", ""))
        let artistName = decodeURIComponent(artist).replace(".mp3", "")

        document.querySelector(".songname").innerHTML = songName
        document.querySelector(".songartist").innerHTML = artistName

        console.log("Now Playing:", { currentIndex, song: songs[currentIndex], artist: songartists[currentIndex] })
    }
}


// Initialize playlist
async function main() {
    songs = await getSongs()
    songartists = await getSongartists()

    console.log("Songs:", songs)
    console.log("Artists:", songartists)

    let songUL = document.querySelector(".songlist ul")

    for (let i = 0; i < songs.length; i++) {
        let song = songs[i]
        let artist = songartists[i]

        let songName = song.split("_")[0].replaceAll("%20", " ")
        let artistName = artist.replaceAll("%20", " ").replace(".mp3", "")

        songUL.innerHTML += `<li>
            <div class="music">
                <img src="music.svg" alt="">
                <div class="info">
                    <div class="name">${songName}</div>
                    <div class="artist">${artistName}</div>
                </div>
            </div>
            <div class="playnow flex">
                <img class="play-button items-center" src="play.svg" alt="Play" data-index="${i}">
            </div>
        </li>`
    }

    if (songs.length > 0) {
        audio.src = `http://192.168.0.101:3000/songs/${songs[0]}`
    }

    setupSongPlayButtons()
}

main()

const playbtn = document.getElementById("playbutton")
const nextbtn = document.getElementById("nextbutton")
const replaybtn = document.getElementById("replaybutton")

// Playbar Play/Pause
playbtn.addEventListener("click", async () => {
    if (!audio.src && songs.length > 0) {
        currentIndex = 0
        audio.src = `http://192.168.0.101:3000/songs/${songs[currentIndex]}`    
    }
        updatePlaybarInfo()
        getDuration()

    if (isPlaying) {
        audio.pause()
        playbtn.src = "play.svg"
        playbtn.alt = "Play"
    } else {
        try {
            await audio.play()
            playbtn.src = "pause.svg"
            playbtn.alt = "Pause"
        } catch (e) {
            console.error("Autoplay blocked or audio error:", e)
        }
    }

    isPlaying = !isPlaying
})

// Next button
nextbtn.addEventListener("click", async () => {
    if (songs.length === 0) return
    currentIndex = (currentIndex + 1) % songs.length
    audio.src = `http://192.168.0.101:3000/songs/${songs[currentIndex]}`
    updatePlaybarInfo()
    getDuration()

    try {
        await audio.play()
        playbtn.src = "pause.svg"
        playbtn.alt = "Pause"
        isPlaying = true
    } catch (e) {
        console.log("Next song error:", e)
    }
})

// Replay button
replaybtn.addEventListener("click", async () => {
    if (songs.length === 0) return
    audio.currentTime = 0

    if (!isPlaying) {
        try {
            await audio.play()
            playbtn.src = "pause.svg"
            playbtn.alt = "Pause"
            isPlaying = true
        } catch (e) {
            console.log("Replay error:", e)
        }
    }
})

// Auto-play next when song ends
audio.addEventListener("ended", () => {
    nextbtn.click()
    updatePlaybarInfo()
    getDuration()
})

// Song-specific play buttons
function setupSongPlayButtons() {
    const buttons = document.querySelectorAll(".play-button")
    buttons.forEach(button => {
        button.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index)
            if (isNaN(index)) return

            currentIndex = index
            audio.src = `http://192.168.0.101:3000/songs/${songs[currentIndex]}`
            audio.addEventListener("loadedmetadata", async () => {
                updatePlaybarInfo()
                getDuration()
                try {
                    await audio.play()
                    playbtn.src = "pause.svg"
                    playbtn.alt = "Pause"
                    isPlaying = true
                } catch (err) {
                    console.error("Play button error:", err)
                }
            }, { once: true })
        })
    })
}

//Update current time and fill the seekbar while playing
audio.ontimeupdate = () => {
    let current = audio.currentTime
    let formattedTime = format(current)
    
    document.querySelector(".current-duration").innerHTML = formattedTime

    let progressPercent = (audio.currentTime / audio.duration) * 100
    const fill = document.querySelector(".seekbar-fill")
    const circle = document.querySelector(".seekbar-circle")
    fill.style.width = `${progressPercent}%`
    circle.style.left = `${progressPercent}%`
}

//Allow user to click on the seekbar to jump
document.querySelector(".seekbar").addEventListener("click", (e) => {
    const seekbar = e.currentTarget
    const rect = seekbar.getBoundingClientRect()
    const clickx = e.clientX - rect.left
    const percentage = clickx / rect.width

    audio.currentTime = percentage * audio.duration
})

//Enable dragging the seekbar circle
const seekbarCircle = document.querySelector(".seekbar-circle")
let isDragging = false

seekbarCircle.addEventListener("mousedown", () => {
    isDragging = true
})

seekbarCircle.addEventListener("mouseup", () => {
    if(isDragging) isDragging = false
})

seekbarCircle.addEventListener("mousemove", (e) => {
    if(!isDragging) return
    const rect = document.querySelector(".seekbar").getBoundingClientRect()
    const movex = e.clientX - rect.left
    const percent = movex / rect.width
    percent = Math.max(0, Math.min(1, percent))

    audio.currentTime = percent * audio.duration

    //Update current-time duration during drag
    let previewtime = audio.duration * percent
    let formattedTime = format(previewtime)
    document.querySelector(".current-duration").innerHTML = formattedTime
})

//Volume seekbar functionality
document.querySelector(".volume-bar").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickx = e.clientX - rect.left
    const percent = clickx / rect.width

    audio.volume = percent
    updateVolumeUI(audio.volume)
})

//Volume icon to click mute/unmute
document.getElementById("volume-icon").addEventListener("click", () => {
    if (audio.volume > 0) {
        audio.dataset.prevVolume = audio.volume
        audio.volume = 0
    }
    else {
        audio.volume = audio.dataset.prevVolume || 1
    }
    updateVolumeUI(audio.volume)
})

//Update volume bar and icon
function updateVolumeUI(vol) {
    const percent = vol * 100
    document.getElementById("volume-fill").style.width = `${percent}%`
    document.getElementById("volume-circle").style.left = `${percent}%`

    if(vol === 0) {
        document.getElementById("volume-icon").src = "mute.svg"
    }
    else if(vol <= 0.5 && vol > 0) {
        document.getElementById("volume-icon").src = "volume2.svg"
    }
    else {
        document.getElementById("volume-icon").src = "volume1.svg"
    }
}

//Drag Volume Circle
let volumeCircle = document.getElementById("volume-circle")
let isVolumeDragging = false

volumeCircle.addEventListener("mousedown", () => {
    isVolumeDragging = true
})

volumeCircle.addEventListener("mouseup", () => {
    if(isVolumeDragging) isVolumeDragging = false
})

volumeCircle.addEventListener("mousemove", (e) => {
    if(!iVolumeDragging) return
    const rect = document.getElementById("volume-bar").getBoundingClientRect()
    const movex = e.clientX - rect.left
    const percent = movex / rect.width
    percent = Math.max(0, Math.min(1, percent))

    audio.volume = percent
    updateVolumeUI(audio.volume)
})

//Set initials
audio.volume = 1
updateVolumeUI(audio.volume)