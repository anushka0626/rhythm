const button = document.querySelector("#spotifyBtn");
const status = document.querySelector("#status");

button.addEventListener("click", () => {

    status.textContent = "Spotify Connection Coming Soon";

    console.log("Button Clicked");

});