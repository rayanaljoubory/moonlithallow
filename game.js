
import { WIDTH, HEIGHT} from "./constants.mjs";
import { MoonlitHollow } from "./MoonlitHollow.mjs";

// Start the game after the page has loaded and its HTML elements are available.
window.onload = () => {
    // Let wheel input over the canvas scroll the web page vertically.
    window.addEventListener("wheel", event => {
        if (!(event.target instanceof Element) || !event.target.closest("#gameCanvas")) return;
        event.preventDefault();
        window.scrollBy(0, event.deltaY);
    }, { passive: false, capture: true });

    const currentEmail = localStorage.getItem("currentUser");
    let users;

    // Read saved accounts so only a registered, signed-in user can play.
    try {
        users = JSON.parse(localStorage.getItem("users") || "[]");
    } catch (error) {
        document.querySelector("#gameMessage").textContent =
            `Your saved account data could not be read: ${error.message}`;

    }

    if (!currentEmail || !Array.isArray(users) || !users.some(user => user && user.email === currentEmail)) {
        localStorage.removeItem("currentUser");
        window.location.replace("login.html?required=1");
        
    }
    // Report a useful message if Phaser did not load from the external script.
    if (!window.Phaser) {
        document.querySelector("#gameMessage").textContent =
            "The game engine could not load. Check your internet connection and refresh this page.";
        return;
    }

    // Configure the Phaser canvas, scaling, physics, and active game scene.
    new Phaser.Game({
        type: Phaser.AUTO,
        parent: "gameCanvas",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "#10121b",
        pixelArt: false,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: "arcade",
            arcade: { gravity: { y: 0 }, debug: false }
        },
        scene: MoonlitHollow
    });

}
